const sqlite3 = require("sqlite3").verbose();

// This function retrieves the next unprocessed TikTok video from the database
// that has not been downloaded or posted yet.
function getNextUnprocessedTikTok(dbPath, callback) {
  const db = new sqlite3.Database(dbPath);
  db.get(
    `
    SELECT * FROM tiktoks
    WHERE posted = 0
    ORDER BY downloaded DESC, created_at ASC
    LIMIT 1
    `,
    (err, row) => {
      db.close();
      callback(err, row);
    }
  );
}

module.exports = { getNextUnprocessedTikTok };
