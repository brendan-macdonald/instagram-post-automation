/**
 * GET /:account/queue
 * Returns the 10 most recent media queue entries for the given account.
 * Loads account info from accounts.json and queries its SQLite database.
 *
 * POST /:account/queue
 * Bulk insert media queue entries for the given account.
 * Accepts a single object or an array of objects in the request body.
 */

const express = require("express");
const fs = require("fs");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();

const router = express.Router({ mergeParams: true }); // <-- mergeParams is important!

router.get("/", (req, res) => {
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

router.post("/", (req, res) => {
  const accountName = req.params.account;
  const accountsPath = path.resolve(__dirname, "../../accounts.json");

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
    const db = new sqlite3.Database(dbPath);

    // 1) Normalize req.body to an array
    let items = Array.isArray(req.body) ? req.body : [req.body];

    // 2) Validate and normalize each item
    const validSources = ["tiktok", "twitter"];
    const preparedItems = [];
    for (const item of items) {
      if (!item.url || typeof item.url !== "string") {
        return res.status(400).json({ error: "Each item must have a url" });
      }
      // Detect source
      let source = item.source;
      if (!source) {
        if (/tiktok\.com/.test(item.url)) source = "tiktok";
        else if (/twitter\.com|x\.com/.test(item.url)) source = "twitter";
        else
          return res
            .status(400)
            .json({ error: "Could not detect source for url: " + item.url });
      }
      if (!validSources.includes(source)) {
        return res.status(400).json({ error: "Invalid source: " + source });
      }
      // Caption strategy
      let caption_strategy = item.caption_strategy || "default";
      if (!["default", "custom", "from_source"].includes(caption_strategy)) {
        caption_strategy = "default";
      }
      // Caption custom
      let caption_custom =
        typeof item.caption_custom === "string" ? item.caption_custom : "";
      // Logo: normalize to 0/1
      let logo = item.logo;
      if (logo === undefined || logo === null) logo = 1;
      logo = logo === true || logo === 1 ? 1 : 0;
      // Format preset
      let format_preset = item.format_preset;
      if (
        !format_preset ||
        typeof format_preset !== "string" ||
        !format_preset.trim()
      ) {
        format_preset = source === "tiktok" ? "logo_only" : "caption_top";
      }
      preparedItems.push({
        source,
        url: item.url,
        caption_strategy,
        caption_custom,
        logo,
        format_preset,
      });
    }

    // 3) Bulk insert in a transaction
    db.serialize(() => {
      db.run("BEGIN TRANSACTION");
      const stmt = db.prepare(
        `INSERT INTO media_queue (source, url, caption_strategy, caption_custom, logo, format_preset)
         VALUES (?, ?, ?, ?, ?, ?)`
      );
      const ids = [];
      let errorOccurred = false;
      for (const row of preparedItems) {
        stmt.run(
          row.source,
          row.url,
          row.caption_strategy,
          row.caption_custom,
          row.logo,
          row.format_preset,
          function (err) {
            if (err) {
              errorOccurred = true;
              stmt.finalize();
              db.run("ROLLBACK");
              db.close();
              return res
                .status(500)
                .json({ error: "Insert failed: " + err.message });
            }
            ids.push(this.lastID);
          }
        );
        if (errorOccurred) return;
      }
      stmt.finalize((finalizeErr) => {
        if (errorOccurred) return;
        if (finalizeErr) {
          db.run("ROLLBACK");
          db.close();
          return res
            .status(500)
            .json({ error: "Insert finalize failed: " + finalizeErr.message });
        }
        db.run("COMMIT", (commitErr) => {
          db.close();
          if (commitErr) {
            return res
              .status(500)
              .json({ error: "Commit failed: " + commitErr.message });
          }
          res.json({ inserted: preparedItems.length, ids });
        });
      });
    });
  });
});

router.delete("/:id", (req, res) => {
  const accountName = req.params.account;
  const id = req.params.id;
  const accountsPath = path.resolve(__dirname, "../../accounts.json");

  fs.readFile(accountsPath, "utf8", (err, data) => {
    if (err)
      return res.status(500).json({ error: "Could not read accounts.json" });
    let accounts;
    try {
      accounts = JSON.parse(data);
    } catch {
      return res.status(500).json({ error: "Invalid accounts.json format" });
    }
    const account = accounts.find((a) => a.username === accountName);
    if (!account || !account.dbPath)
      return res.status(404).json({ error: "Account not found" });
    const dbPath = path.resolve(__dirname, "../../", account.dbPath);
    const db = new sqlite3.Database(dbPath);
    db.run("DELETE FROM media_queue WHERE id = ?", [id], function (err) {
      db.close();
      if (err) return res.status(500).json({ error: "Delete failed" });
      res.json({ ok: true, deleted: this.changes });
    });
  });
});

module.exports = router;
