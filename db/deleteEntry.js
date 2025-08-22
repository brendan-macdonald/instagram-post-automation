// db/clearTable.js
const sqlite3 = require("sqlite3").verbose();
const path = require("path");

// Require DB path and media ID as command-line arguments
const dbArg = process.argv[2];
const idArg = process.argv[3];

if (!dbArg || !idArg) {
  console.log("Usage: node db/deleteEntry.js <dbPath> <mediaId>");
  process.exit(1);
}

const dbPath = path.resolve(__dirname, dbArg);
const mediaId = parseInt(idArg, 10);

const db = new sqlite3.Database(dbPath);

db.run(`DELETE FROM media_queue WHERE id = ?`, [mediaId], function (err) {
  if (err) {
    console.error("Error deleting entry:", err.message);
  } else if (this.changes === 0) {
    console.log(`No row found with id ${mediaId}.`);
  } else {
    console.log(`Row with id ${mediaId} deleted from media_queue table.`);
  }
  db.close();
});
