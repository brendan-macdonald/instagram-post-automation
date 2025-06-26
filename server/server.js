const express = require("express");
const path = require("path");
require("dotenv").config();

//define port for local development
const PORT = 3000;
//create express app
const app = express();

//serve static video files from 'downloads' directory to make any file in the directory publicly accessible
app.use("/downloads", express.static(path.join(__dirname, "../downloads")));

//Start local express server
app.listen(PORT, () => {
  const localUrl = `http://localhost:${PORT}`;
  console.log(`Server is running on: ${localUrl}`);
  console.log("Your Cloudflare Tunnel should be running separately.");
  console.log("Public URL (set in .env):", process.env.CLOUDFLARE_PUBLIC_URL);
});
