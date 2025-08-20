const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const dbPath = path.resolve(__dirname, process.argv[2] || "zerotobuilt.db");

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) console.error("Error opening database " + err.message);
  else console.log("Connected:", dbPath);
});

db.serialize(() => {
  db.run(
    `
    CREATE TABLE IF NOT EXISTS media_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source TEXT NOT NULL CHECK (source IN ('tiktok','twitter')),
      url TEXT NOT NULL,
      caption_strategy TEXT NOT NULL DEFAULT 'default' CHECK (caption_strategy IN ('default','custom','from_source')),
      caption_custom TEXT DEFAULT '',
      filename TEXT,
      downloaded INTEGER NOT NULL DEFAULT 0,
      posted INTEGER NOT NULL DEFAULT 0,
      logo INTEGER NOT NULL DEFAULT 1,
      format_preset TEXT NOT NULL DEFAULT 'caption_top', -- 'logo_only' | 'caption_top' | 'caption_top+logo'
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );`,
    (err) =>
      err ? console.error(err.message) : console.log("✅ media_queue created")
  );

  db.run(
    `CREATE INDEX IF NOT EXISTS idx_media_queue_status ON media_queue(posted, downloaded, created_at);`,
    (err) =>
      err ? console.error(err.message) : console.log("✅ index created")
  );
});

db.close((err) => {
  if (err) console.error(err.message);
  else console.log("Closed.");
});
