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
