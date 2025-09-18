/**
 * GET /api/accounts
 * Reads accounts.json and returns the list of accounts.
 * Used by the UI to populate the account dropdown.
 */

const express = require("express");
const fs = require("fs");
const path = require("path");

const router = express.Router();

router.get("/", (req, res) => {
  const accountsPath = path.resolve(__dirname, "../../accounts.json");
  fs.readFile(accountsPath, "utf8", (err, data) => {
    if (err) {
      return res.status(500).json({ error: "Could not read accounts.json" });
    }
    try {
      const accounts = JSON.parse(data);
      res.json(accounts);
    } catch (parseErr) {
      res.status(500).json({ error: "Invalid accounts.json format" });
    }
  });
});

module.exports = router;
