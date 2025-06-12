const express = require("express");
const ngrok = require("ngrok");
const path = require("path");
const fs = require("fs");
require("dotenv").config();

//define port for local development
const PORT = 3000;
//create express app
const app = express();

//serve static video files from 'downloads' directory to make any file in the directory publicly accessible
app.use("/downloads", express.static(path.join(__dirname, "../downloads")));

//Start local express server
app.listen(PORT, async () => {
  const localUrl = `http://localhost:${PORT}`;
  console.log(`Server is running on: ${localUrl}`);

  try {
    //start public ngrok tunnel to expose local server to the public with authtoken
    //need to run this once if not already configured: ngrok config add-authtoken <token>
    const url = await ngrok.connect({
      addr: PORT,
      authtoken: process.env.NGROK_AUTHTOKEN,
    });
    console.log(`Public ngrok url: ${url}/downloads/<tiktok_video>.mp4`);

    //write the public URL directly into .env
    const envPath = path.resolve(__dirname, "../.env");

    // load current .env content and replace or add NGROK_PUBLIC_URL
    let envContents = fs.existsSync(envPath)
      ? fs.readFileSync(envPath, "utf-8")
      : "";
    const updatedEnv = envContents
      .split("\n")
      .filter((line) => !line.startsWith("NGROK_PUBLIC_URL="))
      .concat(`NGROK_PUBLIC_URL=${url}`)
      .join("\n");

    fs.writeFileSync(envPath, updatedEnv);
    console.log("NGROK_PUBLIC_URL saved to .env");
  } catch (err) {
    console.log("Failed to start ngrok tunnel:", err.message);
  }
});
