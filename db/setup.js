/**
 * setup.js
 * Command-line script to initialize the SQLite database schema for media management.
 *
 * Behavior:
 *   - Creates the `media_queue` table if it does not exist.
 *   - Ensures an index is present on `posted`, `downloaded`, and `created_at` for efficient queries.
 *   - Table is designed to track media items (TikTok/Twitter) through the pipeline: import → download → transcode → publish.
 *
 * Table: media_queue
 *   - id              : INTEGER PRIMARY KEY AUTOINCREMENT
 *   - source          : TEXT (tiktok|twitter) — identifies platform
 *   - url             : TEXT — media link
 *   - caption_strategy: TEXT (default|custom|from_source) — how caption is chosen
 *   - caption_custom  : TEXT — custom caption (if strategy=custom)
 *   - filename        : TEXT — local file name assigned after download
 *   - downloaded      : INTEGER (0|1) — whether file has been downloaded
 *   - posted          : INTEGER (0|1) — whether file has been posted
 *   - logo            : INTEGER (0|1) — whether to overlay a logo at transcode
 *   - format_preset   : TEXT (logo_only|caption_top|caption_top+logo) — styling preset for transcode
 *   - created_at      : TIMESTAMP DEFAULT CURRENT_TIMESTAMP
 *
 * Exports:
 *   - (none) — this is a CLI script.
 *
 * Usage:
 *   node db/setup.js [dbPath]
 *   // Example:
 *   // node db/setup.js ./db/cryptoguide.db
 */

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
