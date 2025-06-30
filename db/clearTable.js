// db/clearTable.js
const sqlite3 = require("sqlite3").verbose();
const path = require("path");

// Require DB path as a command-line argument
const dbArg = process.argv[2];
if (!dbArg) {
  console.log("Usage: node db/clearTable.js <dbPath>");
  process.exit(1);
}
const dbPath = path.resolve(__dirname, dbArg);

const db = new sqlite3.Database(dbPath);

db.run(`DELETE FROM tiktoks`, function (err) {
  if (err) {
    console.error("Error clearing table:", err.message);
  } else {
    console.log("All rows deleted from tiktoks table.");
  }
  db.close();
});
