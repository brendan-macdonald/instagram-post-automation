const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const dbPath = path.resolve(__dirname, "tiktoks_dailyrapscene.db");

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("Error opening database " + err.message);
  } else {
    console.log("Connected to the TikTok to Instagram database.");
  }
});
// This script sets up the SQLite database for storing TikTok video information
// and creates the necessary table if it doesn't exist.
db.serialize(() => {
  db.run(
    `CREATE TABLE IF NOT EXISTS tiktoks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      url TEXT NOT NULL,
      caption TEXT,
      filename TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      downloaded BOOLEAN DEFAULT 0,
      posted BOOLEAN DEFAULT 0
    )`,
    (err) => {
      if (err) {
        console.error(err.message);
      } else {
        console.log("tiktoks table created");
      }
    }
  );
});

db.close((err) => {
  if (err) {
    console.error(err.message);
  } else {
    console.log("Database connection closed.");
  }
});
