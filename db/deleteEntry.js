// db/clearTable.js
const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const dbPath = path.resolve(__dirname, "tiktoks.db");
const db = new sqlite3.Database(dbPath);

db.run(
  `DELETE FROM tiktoks
    WHERE ID = 222`,
  function (err) {
    if (err) {
      console.error("Error clearing table:", err.message);
    } else {
      console.log("Row deleted from tiktoks table.");
    }
    db.close();
  }
);
