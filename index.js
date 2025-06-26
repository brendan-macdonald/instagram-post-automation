const { getNextUnprocessedTikTok } = require("./utils/getNextUnprocessed");
const { downloadTikTokVideo } = require("./utils/downloadTikTok");
const { uploadToInstagram } = require("./utils/uploadToInstagram");
const { transcodeVideo } = require("./utils/transcodeVideo");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
require("dotenv").config();

//resolve database path
const dbPath = path.resolve(__dirname, "db/tiktoks.db");
console.log("Database path:", dbPath);

// connect to sqlite database
const db = new sqlite3.Database(dbPath);

// get logo
const logoPath = path.resolve(__dirname, "./assets", "zerotobuilt.jpg");
// const logoPath = path.resolve(__dirname, "./assets", "cryptoguide.png");

//get local server public URL from CloudFlare
const cloudflareUrl = process.env.CLOUDFLARE_PUBLIC_URL;

if (!cloudflareUrl) {
  console.error("CLOUDFLARE_PUBLIC_URL is not set in .env");
  process.exit(1);
}

// 1) fetch the next unprocessed TikTok video from the database
getNextUnprocessedTikTok(async (err, row) => {
  if (err) {
    console.error("Error fetching unprocessed TikTok:", err);
    return process.exit(1);
  }
  if (!row) {
    console.log("No unprocessed TikTok videos found.");
    return process.exit(99);
  }
  //2) process/download the TikTok video
  const { id, url } = row;
  const outputFilename = `tiktok_${id}.mp4`;

  try {
    await downloadTikTokVideo(url, outputFilename);

    //3) update the database to mark this TikTok as downloaded
    db.run(
      `UPDATE tiktoks SET downloaded =1, filename = ? WHERE id = ?`,
      [outputFilename, id],
      async (err) => {
        if (err) {
          console.error("Error updating TikTok as downloaded:", err.message);
        } else {
          console.log(`TikTok video ${id} marked as downloaded.`);

          //4) upload video to Instagram via Graph API
          try {
            const caption =
              "Follow @zerotobuilt for daily engineering / technology content ⚙️📲\n\n" +
              "#manufacturing #engineer #invention #howitsmade #entrepreneur #engineeringlife #processengineering #mechanical_engineering #howitworks #engineering #construction #innovation #civilengineering #building #mechanicalengineering";

            // const caption =
            //   "Follow @cryptoguide.us for daily crypto / memecoin content 🚀📲\n\n" +
            //   "#crypto #bitcoin #btc #cryptocurrency #cryptonews #bitcoinnews #cryptotips #memecoin #memecoins #dogecoin #cryptomemes";

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

            await transcodeVideo(originalPath, transcodedPath, logoPath);

            // Upload transcoded video
            const uploadResult = await uploadToInstagram(
              cloudflareUrl,
              transcodedFilename,
              caption
            );

            // Only mark as posted if upload was successful
            if (uploadResult && uploadResult.success) {
              console.log("Instagram upload complete.");
              db.run(
                `UPDATE tiktoks SET posted = 1 WHERE id = ?`,
                [id],
                (err) => {
                  if (err) {
                    console.log(
                      "Error updating tiktok as posted:",
                      err.message
                    );
                  } else {
                    console.log(`Tiktok video ${id} marked as posted.`);
                  }
                  db.close();
                  process.exit(0); // <-- Success
                }
              );
            } else {
              console.log("Instagram upload failed, not marking as posted.");
              db.close();
              process.exit(1); // <-- Failure
            }
          } catch (uploadErr) {
            console.log("Failed to upload to Instagram:", uploadErr.message);
            db.close();
            process.exit(1); // <-- Failure
          }
        }
      }
    );
  } catch (downloadError) {
    console.error("Error downloading TikTok video:", downloadError);
    db.close();
  }
});
