// index.js
"use strict";

require("dotenv").config();

const path = require("path");
const fs = require("fs");
const sqlite3 = require("sqlite3").verbose();

const { getNextUnprocessedMedia } = require("./utils/getNextUnprocessed");
const { downloadMedia } = require("./utils/downloadMedia");
const { transcodeVideo } = require("./utils/transcodeVideo");
const { uploadToInstagram } = require("./utils/uploadToInstagram");

// ---------- Env & constants ----------
const accountName = process.env.ACCOUNT_NAME || "unknown";
const safeAccount = accountName.replace(/[^a-z0-9._-]/gi, "_");

const dbPath = process.env.DB_PATH;
const IG_ACCESS_TOKEN = process.env.IG_ACCESS_TOKEN;
const IG_USER_ID = process.env.IG_USER_ID;
const cloudflareUrl = process.env.CLOUDFLARE_PUBLIC_URL;

// Caption is optional; empty string is fine
const captionDefault = process.env.CAPTION || "";

// Logo is optional at runtime; we resolve it if provided.
// Whether we actually use it is controlled by the DB `logo` column.
const logoPath = process.env.LOGO_PATH
  ? path.resolve(__dirname, process.env.LOGO_PATH)
  : null;

const REQUIRED_VARS = {
  DB_PATH: dbPath,
  IG_ACCESS_TOKEN,
  IG_USER_ID,
  CLOUDFLARE_PUBLIC_URL: cloudflareUrl,
};

console.log(`[${accountName}] Received DB_PATH: ${dbPath}`);
console.log(`[${accountName}] Starting processing...`);

// Validate must-have envs
for (const [k, v] of Object.entries(REQUIRED_VARS)) {
  if (!v) {
    console.error(
      `[${accountName}] Missing required environment variable: ${k}`
    );
    process.exit(1);
  }
}

// ---------- DB ----------
const db = new sqlite3.Database(dbPath);

function closeAndExit(code) {
  try {
    db.close();
  } catch (_) {
    // noop
  }
  process.exit(code);
}

// ---------- Main flow ----------
getNextUnprocessedMedia(dbPath, async (err, row) => {
  if (err) {
    console.error(`[${accountName}] Error fetching unprocessed media:`, err);
    return closeAndExit(1);
  }

  if (!row) {
    console.log(`[${accountName}] No unprocessed media found.`);
    return closeAndExit(99);
  }

  const {
    id,
    url,
    source,
    caption_strategy,
    caption_custom,
    logo, // 1 = with logo, 0 = no logo (null/undefined treated as with logo for backwards compatibility below)
    format_preset,
  } = row;

  // Unique file name per account to avoid cross-account collisions
  const baseFilename = `${safeAccount}_media_${id}`;

  try {
    // 1) Download (and possibly extract caption)
    const { videoPath, caption: source_caption } = await downloadMedia(
      source,
      url,
      baseFilename,
      accountName
    );

    // Ensure the downloader actually wrote a file where it said it did
    if (!videoPath || !fs.existsSync(videoPath)) {
      console.error(
        `[${accountName}] Downloaded file not found at expected path: ${videoPath}`
      );
      return closeAndExit(1);
    }

    // 2) Mark as downloaded in DB
    await new Promise((resolve, reject) => {
      db.run(
        `UPDATE media_queue SET downloaded = 1, filename = ? WHERE id = ?`,
        [path.basename(videoPath), id],
        (e) => (e ? reject(e) : resolve())
      );
    });

    console.log(`[${accountName}] Media ${id} marked as downloaded.`);

    // 3) Transcode
    const originalPath = videoPath;
    const transcodedFilename = `transcoded_${path.basename(videoPath)}`;
    const transcodedPath = path.join(
      path.dirname(videoPath),
      transcodedFilename
    );

    // Treat null/undefined as "true" for backward compat (old rows assumed logo)
    const withLogo = logo !== 0;

    const transcodeOptions = {
      preset: format_preset,
      caption_strategy,
      caption_custom,
      source_caption,
      default_caption: captionDefault,
    };

    await transcodeVideo(
      originalPath,
      transcodedPath,
      withLogo ? logoPath : null, // pass logoPath only if we're overlaying
      withLogo,
      transcodeOptions
    );

    // 4) Choose final caption
    const finalCaption =
      caption_strategy === "custom"
        ? (caption_custom || "").trim()
        : caption_strategy === "from_source"
        ? (source_caption || "").trim()
        : (captionDefault || "").trim();

    // 5) Upload via your local server -> Cloudflare public URL
    const uploadResult = await uploadToInstagram(
      cloudflareUrl,
      path.basename(transcodedPath), // the server usually expects filename, not full path
      finalCaption,
      IG_ACCESS_TOKEN,
      IG_USER_ID
    );

    // 6) Post-success bookkeeping
    if (uploadResult && uploadResult.success) {
      console.log(`[${accountName}] Instagram upload complete.`);

      await new Promise((resolve, reject) => {
        db.run(`UPDATE media_queue SET posted = 1 WHERE id = ?`, [id], (e) =>
          e ? reject(e) : resolve()
        );
      });

      console.log(`[${accountName}] Media ${id} marked as posted.`);

      // Best-effort cleanup (don’t fail the job if this throws)
      try {
        fs.unlinkSync(originalPath);
      } catch (e) {
        console.log(`[${accountName}] Could not delete original: ${e.message}`);
      }
      try {
        fs.unlinkSync(transcodedPath);
      } catch (e) {
        console.log(
          `[${accountName}] Could not delete transcoded: ${e.message}`
        );
      }

      return closeAndExit(0);
    } else {
      console.log(
        `[${accountName}] Instagram upload failed or returned no success flag. Not marking as posted.`
      );
      return closeAndExit(1);
    }
  } catch (e) {
    console.log(`[${accountName}] Failed during processing: ${e.message}`);
    return closeAndExit(1);
  }
});
