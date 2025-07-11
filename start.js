const { spawn } = require("child_process");
const fs = require("fs");

// Configurable cadence (in minutes)
const POST_INTERVAL_MINUTES = 7;
const POST_INTERVAL_MS = POST_INTERVAL_MINUTES * 60 * 1000;

// Load accounts
const accounts = JSON.parse(fs.readFileSync("accounts.json", "utf-8"));

// Start the local server
const server = spawn("node", ["server/server.js"], {
  stdio: "inherit",
  env: process.env,
});

// Start Cloudflare Tunnel
const tunnel = spawn("cloudflared", ["tunnel", "run", "my-tunnel"], {
  stdio: "inherit",
});

// Handle errors
let serverErrored = false;
server.on("error", (err) => {
  console.error("Failed to start server:", err);
  serverErrored = true;
  process.exit(1);
});
tunnel.on("error", (err) => {
  console.error("Failed to start Cloudflare Tunnel:", err);
  process.exit(1);
});

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

      const upload = spawn("node", ["index.js"], {
        stdio: "inherit",
        env: {
          ...process.env,
          IG_ACCESS_TOKEN: account.ig_access_token,
          IG_USER_ID: account.ig_user_id,
          DB_PATH: account.dbPath,
          ACCOUNT_NAME: account.username,
          CAPTION: account.caption,
          LOGO_PATH: account.logoPath,
        },
      });

      upload.on("close", (code) => {
        if (code === 99) {
          console.log(`✅ No more unprocessed videos for ${account.username}.`);
          finishedAccounts++;
          if (finishedAccounts === accounts.length) {
            console.log("✅ All accounts finished. Shutting down...");
            server.kill();
            tunnel.kill();
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

    setTimeout(postNextVideo, i * 2000);
  });
}, 5000);

// shutdown on Ctrl+C
process.on("SIGINT", () => {
  console.log("\nShutting down...");
  server.kill();
  tunnel.kill();
  process.exit(0);
});
