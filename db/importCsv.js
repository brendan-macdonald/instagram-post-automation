/**
 * importCsv.js
 * Command-line script to bulk import media entries into the `media_queue` table from `media.csv`.
 *
 * Behavior:
 *   - Reads `media.csv` located in the same directory as this script.
 *   - Requires the SQLite database path as a CLI argument.
 *   - Auto-detects source (TikTok/Twitter) from each URL.
 *   - Applies default format presets by source if not provided:
 *       - TikTok  -> "logo_only"
 *       - Twitter -> "caption_top"
 *   - Inserts rows into `media_queue` with caption/format metadata.
 *
 * CSV SCHEMA (headers expected in media.csv):
 *   - url                : (required) Full media URL. Used to detect the `source`.
 *   - caption_strategy   : (optional) How to derive the caption. One of:
 *       * "default"     -> Use a fallback caption (often blank unless provided downstream).
 *       * "custom"      -> Use the `caption_custom` field (trimmed). If empty, falls back to default.
 *       * "from_source" -> Use a caption pulled from the source (e.g., tweet text). Falls back to default if empty.
 *   - caption_custom     : (optional) Caption text when `caption_strategy = "custom"`. Trimmed. May be empty.
 *   - logo               : (optional) Whether to overlay a logo during transcode. Interpreted as:
 *       * "0"           -> no logo (stored as integer 0)
 *       * any other value or blank -> logo on (stored as integer 1)
 *     NOTE: this script only stores the desired flag; the actual overlay is applied by the transcoder (e.g., `transcodeVideo.js`)
 *           when the chosen preset requires/uses a logo and a valid `logoPath` is supplied.
 *   - format_preset       : (optional) Output styling preset for the transcoder. Recognized values:
 *       * "logo_only"    -> Places a logo near the top and the video slightly lower (see `transcodeVideo.js`).
 *       * "caption_top"  -> Renders a top caption block, positions video below it.
 *       * "raw"          -> Scales video onto a white 1080x1920 canvas with light 1.05x time scaling, no overlay.
 *     If omitted, the preset is auto-selected by source:
 *       * TikTok  -> "logo_only"
 *       * Twitter -> "caption_top"
 *
 * HOW OPTIONS WORK TOGETHER (high-level pipeline):
 *   1) This script parses each CSV row and stores: source, url, caption_strategy, caption_custom, logo (0/1), and format_preset.
 *   2) A later step in your system (e.g., a job runner) reads one row from `media_queue` and:
 *      - Pulls the source/caption info and resolves text:
 *          * If "custom": use `caption_custom` (trimmed), else fall back to default.
 *          * If "from_source": use caption derived from the platform (e.g., tweet text), else fall back to default.
 *          * If "default": rely on a default/fallback caption.
 *      - Chooses the transcoding preset:
 *          * "caption_top": builds an ASS subtitle block at the top (see `buildAssCaptionFile` in `transcodeVideo.js`).
 *          * "logo_only": requires a valid `logoPath` at transcode time. If missing, the transcode call will reject.
 *          * "raw": no caption/logo overlays; simple scale/pad to 1080x1920.
 *      - Applies `logo` flag to determine whether a logo overlay should be attempted (subject to preset and path availability).
 *
 * SAMPLE CSV ROWS:
 *   url,caption_strategy,caption_custom,logo,format_preset
 *   https://www.tiktok.com/@user/video/123,"default","",1,""            # Becomes TikTok + logo_only preset
 *   https://twitter.com/user/status/456,"from_source","",0,"caption_top" # Explicit preset + derive caption from tweet
 *   https://vm.tiktok.com/abc,"custom","My custom caption",1,"raw"       # Force raw preset + custom caption
 *
 * Exports:
 *   - (none) — this is a CLI script.
 *
 * Usage:
 *   node db/importCsv.js <dbPath>
 *   // Example:
 *   // node db/importCsv.js ./db/cryptoguide.db
 */

const fs = require("fs");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();
const csv = require("csv-parser");

// 1) Resolve paths (CSV next to this file; DB path comes from CLI arg)
const csvPath = path.resolve(__dirname, "media.csv");
const dbArg = process.argv[2];
if (!dbArg) {
  console.log("Use: node db/importCsv.js <dbPath>");
  process.exit(1);
}
const dbPath = path.resolve(__dirname, dbArg);
console.log("Using DB:", dbPath);

// 2) Open SQLite connection (fail fast if path invalid)
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("Failed to open DB:", err.message);
    process.exit(1);
  }
});

// 3) Helper: detect source from URL hostname
function detectSource(rawUrl) {
  try {
    const host = new URL(rawUrl).hostname.replace(/^www\./, "").toLowerCase();
    if (host.endsWith("tiktok.com") || host === "vm.tiktok.com")
      return "tiktok";
    if (host.endsWith("x.com") || host.endsWith("twitter.com"))
      return "twitter";
    return "unknown";
  } catch {
    return "unknown";
  }
}

// 4) Insert rows from CSV into media_queue
db.serialize(() => {
  // Prepared statement for performance + safety
  const insert = db.prepare(`
    INSERT INTO media_queue (source, url, caption_strategy, caption_custom, logo, format_preset)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  let inserted = 0;
  let skipped = 0;

  fs.createReadStream(csvPath)
    .pipe(csv())
    .on("data", (row) => {
      // 4a) Validate URL presence
      const url = row.url && String(row.url).trim();
      if (!url) {
        skipped++;
        return;
      }

      // 4b) Determine source from URL (tiktok/twitter)
      const source = detectSource(url);
      if (source === "unknown") {
        console.warn("Unknown source, skipping:", url);
        skipped++;
        return;
      }

      // 4c) Read optional fields with defaults
      const caption_strategy = (row.caption_strategy || "default").trim(); // default|custom|from_source
      const caption_custom = (row.caption_custom || "").trim();
      const logo = String(row.logo || "").trim() === "0" ? 0 : 1;

      // 4d) Apply default presets by source
      const format_preset =
        (row.format_preset && String(row.format_preset).trim()) ||
        (source === "tiktok" ? "logo_only" : "caption_top");

      // 4e) Insert into DB
      insert.run(
        source,
        url,
        caption_strategy,
        caption_custom,
        logo,
        format_preset
      );
      inserted++;
      console.log(`Inserted ${source} (preset=${format_preset}): ${url}`);
    })
    .on("end", () => {
      // 4f) Finalize statement and close DB
      insert.finalize((err) => {
        if (err) console.error("Finalize error:", err.message);
        console.log(
          `CSV import complete. Inserted=${inserted}, Skipped=${skipped}`
        );
        db.close();
      });
    })
    .on("error", (err) => {
      console.error("CSV read error:", err.message);
      insert.finalize(() => db.close());
    });
});
