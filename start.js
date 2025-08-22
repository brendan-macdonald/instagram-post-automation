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

// Optional: verify creds JSON referenced by config.yml (best effort)
function readYamlQuick(p) {
  try {
    return fs.readFileSync(p, "utf8");
  } catch {
    return "";
  }
}
function credsFileFromConfig(yaml) {
  const m = yaml.match(/credentials-file:\s*(.+)\s*$/m);
  return m ? m[1].trim() : null;
}

// ===== helpers =====
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
