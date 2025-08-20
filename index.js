require("dotenv").config();
const { getNextUnprocessedTikTok } = require("./utils/getNextUnprocessed");
const { downloadTikTokVideo } = require("./utils/downloadTikTok");
const { uploadToInstagram } = require("./utils/uploadToInstagram");
const { transcodeVideo } = require("./utils/transcodeVideo");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const fs = require("fs");

// Get per-account config from environment variables
const dbPath = process.env.DB_PATH;
const IG_ACCESS_TOKEN = process.env.IG_ACCESS_TOKEN;
const IG_USER_ID = process.env.IG_USER_ID;
const cloudflareUrl = process.env.CLOUDFLARE_PUBLIC_URL;
const accountName = process.env.ACCOUNT_NAME || "unknown";
const caption = process.env.CAPTION || "";
const logoPath = process.env.LOGO_PATH
  ? path.resolve(__dirname, process.env.LOGO_PATH)
  : null;

console.log(`[${accountName}] Received DB_PATH:`, dbPath);

if (
  !dbPath ||
  !IG_ACCESS_TOKEN ||
  !IG_USER_ID ||
  !cloudflareUrl ||
  !caption ||
  !logoPath
) {
  console.error(`[${accountName}] Missing required environment variables.`);
  process.exit(1);
}

// connect to sqlite database
const db = new sqlite3.Database(dbPath);

console.log(`[${accountName}] Processing...`);

// 1) fetch the next unprocessed TikTok video from the database
getNextUnprocessedTikTok(dbPath, async (err, row) => {
  if (err) {
    console.error(`[${accountName}] Error fetching unprocessed TikTok:`, err);
    return process.exit(1);
  }
  if (!row) {
    console.log(`[${accountName}] No unprocessed TikTok videos found.`);
    return process.exit(99);
  }
  // 2) process/download the TikTok video
  const { id, url } = row;
  const outputFilename = `tiktok_${id}.mp4`;

  try {
    await downloadTikTokVideo(url, outputFilename, accountName);

    // 3) update the database to mark this TikTok as downloaded
    db.run(
      `UPDATE tiktoks SET downloaded = 1, filename = ? WHERE id = ?`,
      [outputFilename, id],
      async (err) => {
        if (err) {
          console.error(
            `[${accountName}] Error updating TikTok as downloaded:`,
            err.message
          );
        } else {
          console.log(
            `[${accountName}] TikTok video ${id} marked as downloaded.`
          );

          // 4) upload video to Instagram via Graph API
          try {
            // Transcode video before uploading
            const originalPath = path.resolve(
              __dirname,
              "downloads",
              outputFilename
            );
            const transcodedFilename = `transcoded_${outputFilename}`;
            const transcodedPath = path.resolve(
              __dirname,
              "downloads",
              transcodedFilename
            );

            // Use logo/background if logo flag is 1, else pass null for logoPath and false for withLogo
            const withLogo = row.logo !== 0; // treat null/undefined as true for backward compatibility
            await transcodeVideo(
              originalPath,
              transcodedPath,
              withLogo ? logoPath : null,
              withLogo
            );

            // Use DB caption if present and not empty, otherwise use account caption
            const videoCaption =
              row.caption && row.caption.trim() ? row.caption : caption;

            // Upload transcoded video, passing IG credentials
            const uploadResult = await uploadToInstagram(
              cloudflareUrl,
              transcodedFilename,
              videoCaption,
              IG_ACCESS_TOKEN,
              IG_USER_ID
            );

            // Only mark as posted if upload was successful
            if (uploadResult && uploadResult.success) {
              console.log(`[${accountName}] Instagram upload complete.`);
              db.run(
                `UPDATE tiktoks SET posted = 1 WHERE id = ?`,
                [id],
                (err) => {
                  if (err) {
                    console.log(
                      `[${accountName}] Error updating tiktok as posted:`,
                      err.message
                    );
                  } else {
                    console.log(
                      `[${accountName}] Tiktok video ${id} marked as posted.`
                    );
                    // Delete original and transcoded files
                    try {
                      fs.unlinkSync(originalPath);
                      fs.unlinkSync(transcodedPath);
                      console.log(`[${accountName}] Deleted video files.`);
                    } catch (deleteErr) {
                      console.log(
                        `[${accountName}] Error deleting files:`,
                        deleteErr.message
                      );
                    }
                  }
                  db.close();
                  process.exit(0); // <-- Success
                }
              );
            } else {
              console.log(
                `[${accountName}] Instagram upload failed, not marking as posted.`
              );
              db.close();
              process.exit(1); // <-- Failure
            }
          } catch (uploadErr) {
            console.log(
              `[${accountName}] Failed to upload to Instagram:`,
              uploadErr.message
            );
            db.close();
            process.exit(1); // <-- Failure
          }
        }
      }
    );
  } catch (downloadError) {
    console.error(
      `[${accountName}] Error downloading TikTok video:`,
      downloadError
    );
    db.close();
    process.exit(1);
  }
});
