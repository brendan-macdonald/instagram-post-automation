// Purpose: Read media URLs from media.csv and insert rows into media_queue.
// - DB path is NOT hardcoded: pass it as CLI arg -> `node db/importCsv.js ./db/cryptoguide.db`
// - Auto-detect source (tiktok/twitter) from URL
// - Apply sane default format presets per source (twitter -> caption_top, tiktok -> logo_only)

const fs = require("fs");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();
const csv = require("csv-parser");

// 1) Resolve paths (CSV next to this file; DB path comes from CLI arg)
const csvPath = path.resolve(__dirname, "media.csv");
const dbArg = process.argv[2];
if (!dbArg) {
  console.log("Use: node db/importCsv_media.js <dbPath>");
  process.exit(1);
}
const dbPath = path.resolve(__dirname, dbArg);
console.log("Using DB:", dbPath);

// 2) Open SQLite connection (fail fast if path invalid)
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("Failed to open DB:", err.message);
    process.exit(1);
  }
});

// 3) Helper: detect source from URL hostname
function detectSource(rawUrl) {
  try {
    const host = new URL(rawUrl).hostname.replace(/^www\./, "").toLowerCase();
    if (host.endsWith("tiktok.com") || host === "vm.tiktok.com")
      return "tiktok";
    if (host.endsWith("x.com") || host.endsWith("twitter.com"))
      return "twitter";
    return "unknown";
  } catch {
    return "unknown";
  }
}

// 4) Insert rows from CSV into media_queue
db.serialize(() => {
  // Prepared statement for performance + safety
  const insert = db.prepare(`
    INSERT INTO media_queue (source, url, caption_strategy, caption_custom, logo, format_preset)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  let inserted = 0;
  let skipped = 0;

  fs.createReadStream(csvPath)
    .pipe(csv())
    .on("data", (row) => {
      // 4a) Validate URL presence
      const url = row.url && String(row.url).trim();
      if (!url) {
        skipped++;
        return;
      }

      // 4b) Determine source from URL (tiktok/twitter)
      const source = detectSource(url);
      if (source === "unknown") {
        console.warn("Unknown source, skipping:", url);
        skipped++;
        return;
      }

      // 4c) Read optional fields with defaults
      const caption_strategy = (row.caption_strategy || "default").trim(); // default|custom|from_source
      const caption_custom = (row.caption_custom || "").trim();
      const logo = String(row.logo || "").trim() === "0" ? 0 : 1;

      // 4d) Your requested defaults: twitter -> caption_top, tiktok -> logo_only
      const format_preset =
        (row.format_preset && String(row.format_preset).trim()) ||
        (source === "tiktok" ? "logo_only" : "caption_top");

      // 4e) Insert into DB
      insert.run(
        source,
        url,
        caption_strategy,
        caption_custom,
        logo,
        format_preset
      );
      inserted++;
      console.log(`Inserted ${source} (preset=${format_preset}): ${url}`);
    })
    .on("end", () => {
      // 4f) Finalize statement and close DB
      insert.finalize((err) => {
        if (err) console.error("Finalize error:", err.message);
        console.log(
          `CSV import complete. Inserted=${inserted}, Skipped=${skipped}`
        );
        db.close();
      });
    })
    .on("error", (err) => {
      console.error("CSV read error:", err.message);
      insert.finalize(() => db.close());
    });
});
