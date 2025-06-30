const sqlite3 = require("sqlite3").verbose();
const path = require("path");

// Require DB path as a command-line argument
const dbArg = process.argv[2];
if (!dbArg) {
  console.log("Usage: node db/insertSample.js <dbPath>");
  process.exit(1);
}
const dbPath = path.resolve(__dirname, dbArg);

const db = new sqlite3.Database(dbPath);

const sampleData = [
  {
    url: "https://www.tiktok.com/@mrbeast/video/7505849400019717406",
    caption: "Andy Filips",
    filename: "Andy.mp4",
  },
  {
    url: "https://www.tiktok.com/@mrbeast/video/7508056331211787551",
    caption: "Dalton Riggs",
    filename: "Dalton.mp4",
  },
];
// This script inserts sample TikTok data into the database
// to test the application functionality.
db.serialize(() => {
  const stmt = db.prepare(
    `INSERT INTO tiktoks (url, caption, filename) VALUES (?, ?, ?)`
  );

  sampleData.forEach(({ url, caption, filename }) => {
    stmt.run(url, caption, filename, (err) => {
      if (err) {
        console.error("Error inserting sample data:", err.message);
      } else {
        console.log(`Inserted sample data: ${url}`);
      }
    });
  });
  stmt.finalize((err) => {
    if (err) {
      console.error("Error finalizing statement:", err.message);
    } else {
      console.log("Sample data inserted successfully.");
    }
    db.close();
  });
});
