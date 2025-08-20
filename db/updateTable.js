const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const dbPath = path.resolve(__dirname, "tiktoks_dailyrapscene.db");

const db = new sqlite3.Database(dbPath);

// This script sets up the SQLite database for storing TikTok video information
// and creates the necessary table if it doesn't exist.
db.run(`UPDATE tiktoks SET logo = 1 WHERE logo IS NULL;`, (err) => {
  if (err) {
    console.error(err.message);
  } else {
    console.log("tiktoks column for logo added!");
  }
});

db.close((err) => {
  if (err) {
    console.error(err.message);
  } else {
    console.log("Database connection closed.");
  }
});
