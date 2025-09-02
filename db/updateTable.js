/**
 * updateTable.js
 * Command-line script to apply bulk updates to the `media_queue` table in a SQLite database.
 *
 * Behavior:
 *   - Currently resets the `downloaded` flag to 0 for all rows in `media_queue`.
 *   - Can be adapted to update other columns (e.g., `logo`, `posted`, `format_preset`) by changing the SQL statement.
 *   - Useful for maintenance, data cleanup, or resetting pipeline states in bulk.
 *
 * Exports:
 *   - (none) — this is a CLI script.
 *
 * Usage:
 *   node db/updateTable.js
 *   // Example (reset all downloaded flags):
 *   // node db/updateTable.js
 *
 *   // To adapt for other columns:
 *   // Change SQL to something like:
 *   // db.run("UPDATE media_queue SET logo = 1 WHERE logo IS NULL;");
 */

const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const dbPath = path.resolve(__dirname, "zerotobuilt.db"); // <-- update as needed

const db = new sqlite3.Database(dbPath);

// This script updates the logo column for all media where logo is NULL
db.run(`UPDATE media_queue SET downloaded = 0;`, (err) => {
  if (err) {
    console.error(err.message);
  } else {
    console.log("media_queue column for logo updated!");
  }
});

db.close((err) => {
  if (err) {
    console.error(err.message);
  } else {
    console.log("Database connection closed.");
  }
});
