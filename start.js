/**
 * start.js
 * Orchestrator for running the local server, Cloudflare Tunnel, and scheduled multi-account posting jobs.
 *
 * Exports:
 *   - (none) — this is a CLI entrypoint.
 *
 * What this script does:
 *   1) Loads account configs from ./accounts.json (per-account DB & IG credentials).
 *   2) Starts your local HTTP server (server/server.js).
 *   3) Starts a named Cloudflare Tunnel using ~/.cloudflared/config.yml.
 *   4) For each account, repeatedly runs `node index.js` on a schedule to post the next queued video.
 *   5) Gracefully shuts down the server and tunnel when all accounts are finished or on SIGINT.
 *
 * Usage:
 *   node start.js
 *
 * Required files & config:
 *   - ./accounts.json            : Array of accounts with keys used below (username, ig_user_id, ig_access_token, dbPath, caption?, logoPath?)
 *   - ~/.cloudflared/config.yml  : Must define `tunnel:` and `credentials-file:`; this script verifies both.
 *   - server/server.js           : Your local server that serves /downloads/* to the tunnel hostname.
 *
 * Scheduling:
 *   - Interval is POST_INTERVAL_MINUTES (default 7 minutes) between posts per account.
 *   - If an account runs out of unprocessed media (exit code 99 from index.js), it stops for that account.
 *   - When all accounts are finished, the script stops the server & tunnel and exits.
 *
 * Example accounts.json (minimal):
 * [
 *   {
 *     "username": "zerotobuilt",
 *     "ig_user_id": "1784xxxxxxxxxxxx",
 *     "ig_access_token": "IGQVJ...",
 *     "dbPath": "./db/zerotobuilt.db",
 *     "caption": "Follow @ZeroToBuilt for more 🚀",
 *     "logoPath": "./assets/ztb_logo.png"
 *   }
 * ]
 */

require("dotenv").config();

const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

// ===== Scheduling =====
const POST_INTERVAL_MINUTES = 7;
const POST_INTERVAL_MS = POST_INTERVAL_MINUTES * 60 * 1000;

// ===== Inputs =====
const accountsPath = path.resolve(__dirname, "accounts.json");
if (!fs.existsSync(accountsPath)) {
  console.error("accounts.json not found. Create it next to start.js.");
  process.exit(1);
}
const accounts = JSON.parse(fs.readFileSync(accountsPath, "utf-8"));

// ===== Cloudflared config (named tunnel + creds JSON) =====
const HOME =
  process.env.HOME || process.env.USERPROFILE || "/home/brendanmacdonald";
const CF_DIR = path.join(HOME, ".cloudflared");
const CF_CONFIG =
  process.env.CF_TUNNEL_CONFIG || path.join(CF_DIR, "config.yml");
const TUNNEL_NAME = process.env.CF_TUNNEL_NAME || "my-tunnel";

/**
 * Read a YAML file quickly (best effort).
 * @param {string} p - Path to YAML file.
 * @returns {string} Raw file contents or empty string on failure.
 */
function readYamlQuick(p) {
  try {
    return fs.readFileSync(p, "utf8");
  } catch {
    return "";
  }
}

/**
 * Extract `credentials-file:` absolute path from cloudflared config text.
 * @param {string} yaml - Contents of config.yml.
 * @returns {string|null} Path to credentials JSON, if found.
 */
function credsFileFromConfig(yaml) {
  const m = yaml.match(/credentials-file:\s*(.+)\s*$/m);
  return m ? m[1].trim() : null;
}

// ===== helpers =====
/**
 * Spawn a child process and log the command.
 * @param {string} cmd - Executable name.
 * @param {string[]} args - Arguments array.
 * @param {import('child_process').SpawnOptions} [opts] - Spawn options.
 * @returns {import('child_process').ChildProcess} The spawned process.
 */
function spawnLogged(cmd, args, opts = {}) {
  console.log(`[spawn] ${cmd} ${args.join(" ")}`);
  const child = spawn(cmd, args, { stdio: "inherit", ...opts });
  child.on("error", (err) => {
    console.error(
      `[spawn error] ${cmd} ${args.join(" ")} ->`,
      err?.message || err
    );
  });
  return child;
}

/**
 * Kill a child process if still alive (best effort).
 * @param {import('child_process').ChildProcess|undefined} child - Child process.
 * @param {string} name - Descriptive name for logs.
 */
function killIfAlive(child, name) {
  if (!child) return;
  try {
    child.kill();
  } catch {}
  console.log(`${name} stopped.`);
}

// ===== Start server first =====
const server = spawnLogged("node", ["server/server.js"], { env: process.env });
let serverErrored = false;
server.on("error", (err) => {
  console.error("Failed to start server:", err);
  serverErrored = true;
  process.exit(1);
});

// ===== Start cloudflared using config + creds (like before) =====
if (!fs.existsSync(CF_CONFIG)) {
  console.error(
    `[tunnel] Missing config: ${CF_CONFIG}\n` +
      `Create it in WSL (not Windows) and point credentials-file to the JSON.\n` +
      `~/.cloudflared/config.yml example:\n` +
      `tunnel: c46638b0-20f8-42a4-90ea-925117efe449\n` +
      `credentials-file: /home/brendanmacdonald/.cloudflared/c46638b0-20f8-42a4-90ea-925117efe449.json\n` +
      `ingress:\n  - hostname: api.brendan-macdonald.us\n    service: http://localhost:3000\n  - service: http_status:404\n`
  );
  process.exit(1);
}

const cfgText = readYamlQuick(CF_CONFIG);
const credsPath = credsFileFromConfig(cfgText);
if (credsPath && !fs.existsSync(credsPath)) {
  console.error(
    `[tunnel] credentials-file missing: ${credsPath}\n` +
      `Use one of:\n` +
      `  - Copy the JSON from Windows into WSL at that exact path, OR\n` +
      `  - Run once: cloudflared tunnel run --token '<token>' to fetch it.\n`
  );
  process.exit(1);
}

// Run named tunnel with explicit config path
const tunnel = spawnLogged(
  "cloudflared",
  ["--config", CF_CONFIG, "tunnel", "run", TUNNEL_NAME],
  {
    env: process.env,
  }
);
tunnel.on("exit", (code) => {
  if (code === 0) return;
  console.error(`[tunnel] cloudflared exited with code ${code}.`);
});

// ===== Main loop =====
console.log(`Waiting 5 seconds for server to start...`);
setTimeout(() => {
  if (serverErrored) return;

  let finishedAccounts = 0;

  accounts.forEach((account, i) => {
    const postNextVideo = () => {
      console.log(
        `\n[${new Date().toLocaleTimeString()}] Starting upload for ${
          account.username
        }...`
      );

      const env = {
        ...process.env,
        IG_ACCESS_TOKEN: account.ig_access_token,
        IG_USER_ID: account.ig_user_id,
        DB_PATH: account.dbPath,
        ACCOUNT_NAME: account.username,
        CAPTION: account.caption ?? "",
        LOGO_PATH: account.logoPath ?? "",
      };

      const upload = spawnLogged("node", ["index.js"], { env });

      upload.on("close", (code) => {
        if (code === 99) {
          console.log(`✅ No more unprocessed videos for ${account.username}.`);
          finishedAccounts++;
          if (finishedAccounts === accounts.length) {
            console.log("✅ All accounts finished. Shutting down...");
            killIfAlive(server, "Server");
            killIfAlive(tunnel, "Tunnel");
            process.exit(0);
          }
        } else if (code === 0) {
          console.log(
            `✅ Upload successful for ${account.username}. Scheduling next upload in ${POST_INTERVAL_MINUTES} minutes.`
          );
          setTimeout(postNextVideo, POST_INTERVAL_MS);
        } else {
          console.error(
            `❌ Upload failed for ${account.username} with code ${code}. Will try again in ${POST_INTERVAL_MINUTES} minutes.`
          );
          setTimeout(postNextVideo, POST_INTERVAL_MS);
        }
      });
    };

    // stagger account starts a bit
    setTimeout(postNextVideo, i * 2000);
  });
}, 5000);

// ===== Graceful shutdown =====
process.on("SIGINT", () => {
  console.log("\nShutting down...");
  killIfAlive(server, "Server");
  killIfAlive(tunnel, "Tunnel");
  process.exit(0);
});
