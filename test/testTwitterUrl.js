/**
 * testTwitterUrl.js
 * Test script for downloading a Twitter/X video using `downloadTwitterVideo`.
 *
 * Behavior:
 *   - Accepts a tweet URL and optional basename from the CLI.
 *   - Uses `downloadTwitterVideo` (yt-dlp under the hood) to fetch the video and its caption.
 *   - Saves the downloaded video into the `downloads` directory.
 *   - Logs the saved file path and extracted caption, or logs an error if the process fails.
 *
 * Exports:
 *   - (none) — this is a standalone test script.
 *
 * Usage:
 *   node test/testTwitterUrl.js "<tweet_url>" [basename]
 *   // Example:
 *   // node test/testTwitterUrl.js "https://twitter.com/user/status/1234567890" my_video
 */

const { downloadTwitterVideo } = require("../utils/downloadTwitterVideo");
const url = process.argv[2];
const base = process.argv[3] || "twitter_test";
if (!url) {
  console.log('Use: node test/testTwitterUrl.js "<tweet_url>" [basename]');
  process.exit(1);
}
downloadTwitterVideo(url, base)
  .then(({ videoPath, caption }) => {
    console.log("✅ Saved:", videoPath);
    console.log("Caption:", caption);
  })
  .catch((e) => {
    console.error("❌ Failed:", e.message);
    process.exit(1);
  });
