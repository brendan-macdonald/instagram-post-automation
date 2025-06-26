const { spawn } = require("child_process");

// Configurable cadence (in minutes)
const POST_INTERVAL_MINUTES = 7;
const POST_INTERVAL_MS = POST_INTERVAL_MINUTES * 60 * 1000;

// Start the local server
const server = spawn("node", ["server/server.js"], {
  stdio: "inherit",
  env: process.env,
});

// Track if server has errored or closed
let serverErrored = false;
server.on("error", (err) => {
  console.error("Failed to start server:", err);
  serverErrored = true;
  process.exit(1);
});

// Start Cloudflare Tunnel
const tunnel = spawn("cloudflared", ["tunnel", "run", "my-tunnel"], {
  stdio: "inherit",
});

// handle tunnel errors
tunnel.on("error", (err) => {
  console.error("Failed to start Cloudflare Tunnel:", err);
  process.exit(1);
});

console.log(`Waiting 5 seconds for server to start...`);
setTimeout(() => {
  if (serverErrored) return;

  const postNextVideo = () => {
    console.log(
      `\n[${new Date().toLocaleTimeString()}] Starting upload process...`
    );
    const upload = spawn("node", ["index.js"], {
      stdio: "inherit",
      env: process.env,
    });

    upload.on("close", (code) => {
      if (code === 99) {
        console.log("✅ No more unprocessed videos. Shutting down...");
        server.kill();
        process.exit(0);
      } else if (code === 0) {
        console.log(
          `✅ Upload successful. Scheduling next upload in ${POST_INTERVAL_MINUTES} minutes.`
        );
        setTimeout(postNextVideo, POST_INTERVAL_MS);
      } else {
        console.error(
          `❌ Upload failed with code ${code}. Will try again in ${POST_INTERVAL_MINUTES} minutes.`
        );
        setTimeout(postNextVideo, POST_INTERVAL_MS);
      }
    });
  };

  postNextVideo(); // Start the loop
}, 5000);

// shutdown on Ctrl+C
process.on("SIGINT", () => {
  console.log("\nShutting down...");
  server.kill();
  process.exit(0);
});
