const fs = require("fs");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();
const csv = require("csv-parser");
const { url } = require("inspector");

const dbPath = path.resolve(__dirname, "tiktoks.db");
const csvPath = path.resolve(__dirname, "tiktoks.csv");

const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  const insertCsv = db.prepare(`
    INSERT INTO tiktoks (url, caption, filename, downloaded, posted)
    VALUES (?, ?, ?, 0, 0)
    `);

  fs.createReadStream(csvPath)
    .pipe(csv())
    .on("data", (row) => {
      const { url, caption } = row;
      if (!url) return;

      const filename = `tiktok_download_${Date.now()}.mp4`;
      insertCsv.run(url, caption || "", filename);
      console.log("Inserted:", url);
      console.log("Caption:", caption || "(none)");
    })
    .on("end", () => {
      insertCsv.finalize();
      console.log("CSV Imported successfully.");
      db.close();
    })
    .on("error", (err) => {
      console.error("Error reading CSV:", err);
    });
});
