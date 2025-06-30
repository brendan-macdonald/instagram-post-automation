// db/clearTable.js
const sqlite3 = require("sqlite3").verbose();
const path = require("path");

// Require DB path and TikTok ID as command-line arguments
const dbArg = process.argv[2];
const idArg = process.argv[3];

if (!dbArg || !idArg) {
  console.log("Usage: node db/deleteEntry.js <dbPath> <tiktokId>");
  process.exit(1);
}

const dbPath = path.resolve(__dirname, dbArg);
const tiktokId = parseInt(idArg, 10);

const db = new sqlite3.Database(dbPath);

db.run(`DELETE FROM tiktoks WHERE id = ?`, [tiktokId], function (err) {
  if (err) {
    console.error("Error deleting entry:", err.message);
  } else if (this.changes === 0) {
    console.log(`No row found with id ${tiktokId}.`);
  } else {
    console.log(`Row with id ${tiktokId} deleted from tiktoks table.`);
  }
  db.close();
});
