/**
 * server.js
 * Simple Express server that serves downloaded media files for public access via Cloudflare Tunnel.
 *
 * Behavior:
 *   - Hosts a local HTTP server on port 3000 (configurable if modified).
 *   - Serves static files from the `../downloads` directory under the `/downloads` route.
 *   - Intended to work with Cloudflare Tunnel to expose media files publicly.
 *
 * Exports:
 *   - (none) — this is a standalone server script.
 *
 * Usage:
 *   node server/server.js
 *
 * Notes:
 *   - The public-facing URL should be configured via the `CLOUDFLARE_PUBLIC_URL` environment variable.
 *   - Typically run in the background alongside `start.js`, which manages server and tunnel processes.
 */

const express = require("express");
const path = require("path");
require("dotenv").config();

// define port for local development
const PORT = 3000;
// create express app
const app = express();

// serve static video files from 'downloads' directory to make any file in the directory publicly accessible
app.use("/downloads", express.static(path.join(__dirname, "../downloads")));

// Start local express server
app.listen(PORT, () => {
  const localUrl = `http://localhost:${PORT}`;
  console.log(`Server is running on: ${localUrl}`);
  console.log("Your Cloudflare Tunnel should be running separately.");
  console.log("Public URL (set in .env):", process.env.CLOUDFLARE_PUBLIC_URL);
});
