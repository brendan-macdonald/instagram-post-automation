const { getNextUnprocessedTikTok } = require("./db/getNextUnprocessed");
const { downloadTikTokVideo } = require("./utils/downloadTikTok");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");

// connect to sqlite database
const dbPath = path.resolve(__dirname, "db/tiktoks.db");
console.log("Database path:", dbPath);
const db = new sqlite3.Database(dbPath);

// fetch the next unprocessed TikTok video from the database
getNextUnprocessedTikTok(async (err, row) => {
  if (err) {
    console.error("Error fetching unprocessed TikTok:", err);
    return;
  }
  if (!row) {
    console.log("No unprocessed TikTok videos found.");
    return;
  }
  //process the TikTok video
  const { id, url } = row;
  const outputFilename = `tiktok_${id}.mp4`;

  try {
    await downloadTikTokVideo(url, outputFilename);

    // Update the database to mark this TikTok as downloaded
    const db = new sqlite3.Database(dbPath);
    db.run(
      `UPDATE tiktoks SET downloaded =1, filename = ? WHERE id = ?`,
      [outputFilename, id],
      (err) => {
        if (err) {
          console.error("Error updating TikTok as downloaded:", err.message);
        } else {
          console.log(`TikTok video ${id} marked as downloaded.`);
        }
        db.close();
      }
    );
  } catch (downloadError) {
    console.error("Error downloading TikTok video:", downloadError);
  }
});
