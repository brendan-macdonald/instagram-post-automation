const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const dbPath = path.resolve(__dirname, "tiktoks.db");

const db = new sqlite3.Database(dbPath);
// This script retrieves all TikTok records from the database
// and logs their details to the console.
db.all("SELECT * FROM tiktoks", [], (err, rows) => {
  if (err) {
    throw err;
  }
  console.log("All TikTok records:", rows);
  rows.forEach((row) => {
    console.log(`- ID: ${row.id}`);
    console.log(`  URL: ${row.url}`);
    console.log(`  Caption: ${row.caption}`);
    console.log(`  Filename: ${row.filename}`);
    console.log(`  Created At: ${row.created_at}`);
    console.log(`  Downloaded: ${row.downloaded ? "Yes" : "No"}`);
    console.log(`  Posted: ${row.posted ? "Yes" : "No"}`);
  });
});

db.close();
