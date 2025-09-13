/**
 * GET /:account/status
 * Returns counts of pending, downloaded, and posted media for the given account.
 * Loads account info from accounts.json and queries its SQLite database.
 */

const express = require("express");
const fs = require("fs");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();

const router = express.Router();

router.get("/:account/status", (req, res) => {
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
    console.log(`[status.js] Account: ${accountName}, DB Path: ${dbPath}`);

    const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (dbErr) => {
      if (dbErr) {
        return res.status(500).json({ error: "Could not open database" });
      }
      db.get(
        `SELECT
            COALESCE(SUM(CASE WHEN downloaded = 0 THEN 1 ELSE 0 END), 0) AS pending,
            COALESCE(SUM(CASE WHEN downloaded = 1 AND posted = 0 THEN 1 ELSE 0 END), 0) AS downloaded,
            COALESCE(SUM(CASE WHEN posted = 1 THEN 1 ELSE 0 END), 0) AS posted
         FROM media_queue`,
        [],
        (sqlErr, row) => {
          db.close();
          if (sqlErr) {
            return res.status(500).json({ error: "Database query failed" });
          }
          res.json({
            pending: row.pending,
            downloaded: row.downloaded,
            posted: row.posted,
          });
        }
      );
    });
  });
});

module.exports = router;
