const fs = require("fs");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();

// Usage: node scripts/reset_downloaded.js <dbPath> <id> [table]
// Examples:
//   node scripts/reset_downloaded.js ./db/zerotobuilt.db 1
//   node scripts/reset_downloaded.js ./db/zerotobuilt.db 42 media_queue

const dbArg = process.argv[2];
const idArg = process.argv[3];
const tableArg = (process.argv[4] || "").trim();

// Validate args
if (!dbArg || !idArg) {
  console.log("Usage: node scripts/reset_downloaded.js <dbPath> <id> [table]");
  process.exit(1);
}

// Resolve DB path relative to where you run the command
const dbPath = path.isAbsolute(dbArg)
  ? dbArg
  : path.resolve(process.cwd(), dbArg);

// Validate DB file exists
if (!fs.existsSync(dbPath)) {
  console.error(`DB file not found: ${dbPath}`);
  process.exit(1);
}

// Validate ID
const rowId = Number.parseInt(idArg, 10);
if (!Number.isInteger(rowId) || rowId <= 0) {
  console.error(`Invalid id: ${idArg} (must be a positive integer)`);
  process.exit(1);
}

// Choose table (restrict to known names to avoid SQL injection)
const ALLOWED_TABLES = new Set(["media_queue", "tiktoks", "zerotobuilt"]);
const table =
  tableArg && ALLOWED_TABLES.has(tableArg) ? tableArg : "media_queue";
if (tableArg && !ALLOWED_TABLES.has(tableArg)) {
  console.warn(
    `Warning: table "${tableArg}" not in allowed list; defaulting to "${table}".`
  );
}

const db = new sqlite3.Database(dbPath);
db.serialize(() => {
  // Optional: give SQLite a little patience if the DB is busy
  db.run("PRAGMA busy_timeout = 5000");

  // Reset the downloaded flag (and optionally clear filename if you want)
  const sql = `UPDATE ${table} SET downloaded = 0 WHERE id = ?`;

  db.run(sql, [rowId], function (err) {
    if (err) {
      console.error(`Error updating ${table}:`, err.message);
    } else if (this.changes === 0) {
      console.log(`No row found in "${table}" with id ${rowId}.`);
    } else {
      console.log(`Row id ${rowId} in "${table}" set downloaded = 0.`);
    }
    db.close();
  });
});
