/**
 * Jobs API router for controlling per-account automation jobs.
 * Uses in-memory intervals to schedule posting jobs for each account.
 *
 * Endpoints:
 *   POST /:account/jobs/run-once   - Run index.js once for the account.
 *   POST /:account/jobs/start      - Start scheduled posting for the account.
 *   POST /:account/jobs/stop       - Stop scheduled posting for the account.
 */

const express = require("express");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const router = express.Router();
const intervals = new Map(); // Map<username, NodeJS.Timeout>

function makeEnvForAccount(acc) {
  return {
    ...process.env,
    ACCOUNT_NAME: acc.username,
    DB_PATH: acc.dbPath,
    IG_ACCESS_TOKEN: acc.ig_access_token,
    IG_USER_ID: acc.ig_user_id,
    CLOUDFLARE_PUBLIC_URL: process.env.CLOUDFLARE_PUBLIC_URL,
    CAPTION: acc.default_caption || "",
    LOGO_PATH: acc.logoPath || "",
  };
}

function getAccounts() {
  const accountsPath = path.resolve(__dirname, "../../accounts.json");
  const data = fs.readFileSync(accountsPath, "utf8");
  return JSON.parse(data);
}

router.post("/:account/jobs/run-once", (req, res) => {
  const accountName = req.params.account;
  const acc = getAccounts().find((a) => a.username === accountName);
  if (!acc) {
    return res.status(404).json({ error: "Account not found" });
  }
  const child = spawn("node", ["index.js"], {
    env: makeEnvForAccount(acc),
    stdio: "inherit",
    cwd: path.resolve(__dirname, "../.."),
  });
  child.on("exit", (code) => {
    // Optionally log or handle exit
  });
  res.json({ ok: true });
});

router.post("/:account/jobs/start", (req, res) => {
  const accountName = req.params.account;
  const acc = getAccounts().find((a) => a.username === accountName);
  if (!acc) {
    return res.status(404).json({ error: "Account not found" });
  }
  // Clear existing interval if present
  if (intervals.has(accountName)) {
    clearInterval(intervals.get(accountName));
    intervals.delete(accountName);
  }
  const minutes = Number(process.env.POST_INTERVAL_MINUTES || 7);
  const interval = setInterval(() => {
    spawn("node", ["index.js"], {
      env: makeEnvForAccount(acc),
      stdio: "inherit",
      cwd: path.resolve(__dirname, "../.."),
    });
  }, minutes * 60 * 1000);
  intervals.set(accountName, interval);
  // Also run once immediately
  spawn("node", ["index.js"], {
    env: makeEnvForAccount(acc),
    stdio: "inherit",
    cwd: path.resolve(__dirname, "../.."),
  });
  res.json({ ok: true, minutes });
});

router.post("/:account/jobs/stop", (req, res) => {
  const accountName = req.params.account;
  if (intervals.has(accountName)) {
    clearInterval(intervals.get(accountName));
    intervals.delete(accountName);
  }
  res.json({ ok: true });
});

module.exports = router;
