// utils/getNextUnprocessed.js
const sqlite3 = require("sqlite3").verbose();

function getNextUnprocessed(dbPath, callback) {
  const db = new sqlite3.Database(dbPath);
  db.get(
    `SELECT * FROM media_queue
     WHERE posted = 0
     ORDER BY downloaded DESC, created_at ASC
     LIMIT 1`,
    (err, row) => {
      db.close();
      callback(err, row);
    }
  );
}

module.exports = { getNextUnprocessed };
