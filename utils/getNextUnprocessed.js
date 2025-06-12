const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const dbPath = path.resolve(__dirname, "../db/tiktoks.db");

// This function retrieves the next unprocessed TikTok video from the database
// that has not been downloaded or posted yet.
function getNextUnprocessedTikTok(callback) {
  const db = new sqlite3.Database(dbPath);
  db.get(
    `
    SELECT * FROM tiktoks
    WHERE posted = 0
    ORDER BY downloaded DESC, created_at ASC
    LIMIT 1
    `,
    //callback function to handle the result
    (err, row) => {
      db.close();
      callback(err, row);
    }
  );
}

module.exports = { getNextUnprocessedTikTok };
