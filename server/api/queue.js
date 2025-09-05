/**
 * GET /:account/queue
 * Returns the 10 most recent media queue entries for the given account.
 * Loads account info from accounts.json and queries its SQLite database.
 */

const express = require("express");
const fs = require("fs");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();

const router = express.Router();

router.get("/:account/queue", (req, res) => {
  const accountName = req.params.account;
  const accountsPath = path.resolve(__dirname, "../../accounts.json");

  // Load accounts.json
  fs.readFile(accountsPath, "utf8", (err, data) => {
    if (err) {
      return res.status(500).json({ error: "Could not read accounts.json" });
    }
    let accounts;
    try {
      accounts = JSON.parse(data);
    } catch (parseErr) {
      return res.status(500).json({ error: "Invalid accounts.json format" });
    }
    const account = accounts.find((a) => a.username === accountName);
    if (!account || !account.dbPath) {
      return res.status(404).json({ error: "Account not found" });
    }

    const dbPath = path.resolve(__dirname, "../../", account.dbPath);
    const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (dbErr) => {
      if (dbErr) {
        return res.status(500).json({ error: "Could not open database" });
      }
      db.all(
        `SELECT id, source, url, format_preset, caption_strategy, created_at
         FROM media_queue
         ORDER BY created_at DESC
         LIMIT 10`,
        [],
        (sqlErr, rows) => {
          db.close();
          if (sqlErr) {
            return res.status(500).json({ error: "Database query failed" });
          }
          res.json(rows);
        }
      );
    });
  });
});

module.exports = router;
