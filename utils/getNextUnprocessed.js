/**
 * getNextUnprocessed.js
 * Utility module for retrieving the next unprocessed media item from the SQLite media queue.
 *
 * Exports:
 *   - getNextUnprocessedMedia: Fetches the next media record that has not yet been posted, prioritizing most recently downloaded items.
 *
 * Usage:
 *   const { getNextUnprocessedMedia } = require("./getNextUnprocessed");
 *   getNextUnprocessedMedia("./media.db", (err, row) => { ... });
 */

const sqlite3 = require("sqlite3").verbose();

/**
 * Retrieves the next unprocessed media item from the media queue.
 *
 * Selection logic:
 *   - Filters rows where `posted = 0` (not yet posted).
 *   - Orders by `downloaded DESC` (most recently downloaded first).
 *   - Then orders by `created_at ASC` (oldest created among ties).
 *   - Limits to a single result.
 *
 * @param {string} dbPath - Path to the SQLite database file.
 * @param {function(Error, Object)} callback - Callback invoked with (err, row).
 *   - `err`: Error object if something goes wrong.
 *   - `row`: The next unprocessed media row, or undefined if none found.
 */
function getNextUnprocessedMedia(dbPath, callback) {
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

module.exports = { getNextUnprocessedMedia };
