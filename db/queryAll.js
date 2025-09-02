/**
 * queryAll.js
 * Command-line script to list all records from the `media_queue` table in a SQLite database.
 *
 * Behavior:
 *   - Retrieves every row in `media_queue`.
 *   - Logs details (id, source, url, caption fields, filename, timestamps, flags, logo, format preset).
 *   - Useful for debugging, verifying imports, and monitoring pipeline state.
 *
 * Exports:
 *   - (none) — this is a CLI script.
 *
 * Usage:
 *   node db/queryAll.js <dbPath>
 *   // Example:
 *   // node db/queryAll.js ./db/cryptoguide.db
 */

const sqlite3 = require("sqlite3").verbose();
const path = require("path");

// Require DB path as a command-line argument
const dbArg = process.argv[2];
if (!dbArg) {
  console.log("Usage: node db/queryAll.js <dbPath>");
  process.exit(1);
}
const dbPath = path.resolve(__dirname, dbArg);

const db = new sqlite3.Database(dbPath);

// This script retrieves all media records from the database
// and logs their details to the console.
db.all("SELECT * FROM media_queue", [], (err, rows) => {
  if (err) {
    throw err;
  }
  console.log("All media records:", rows);
  rows.forEach((row) => {
    console.log(`- ID: ${row.id}`);
    console.log(`  Source: ${row.source}`);
    console.log(`  URL: ${row.url}`);
    console.log(`  Caption Strategy: ${row.caption_strategy}`);
    console.log(`  Custom Caption: ${row.caption_custom}`);
    console.log(`  Filename: ${row.filename}`);
    console.log(`  Created At: ${row.created_at}`);
    console.log(`  Downloaded: ${row.downloaded ? "Yes" : "No"}`);
    console.log(`  Posted: ${row.posted ? "Yes" : "No"}`);
    console.log(`  Logo: ${row.logo ? "Yes" : "No"}`);
    console.log(`  Format Preset: ${row.format_preset}`);
    console.log("-----");
  });
  db.close();
});
