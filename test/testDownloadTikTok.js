/**
 * testDownloadTiktok.js
 * Simple test script for verifying TikTok video downloads using the TikWM API integration.
 *
 * Behavior:
 *   - Downloads a sample TikTok video (provided via URL).
 *   - Saves the video under `../downloads` with the given filename.
 *   - Logs success with the saved path or logs an error if the download fails.
 *
 * Exports:
 *   - (none) — this is a standalone test script.
 *
 * Usage:
 *   node db/testDownloadTiktok.js
 *   // Update the `sampleTikTokUrl` with a valid TikTok video URL before running.
 */

const path = require("path");
const { downloadTikTokVideo } = require("../utils/downloadTikTok");

(async () => {
  const sampleTikTokUrl =
    "https://www.tiktok.com/@thecuriousminds.news/video/7508304372753861910"; // Replace with an actual TikTok video URL
  const filename = "test_video.mp4";

  try {
    const resultPath = await downloadTikTokVideo(sampleTikTokUrl, filename);
    console.log(
      `✅ Test passed. Video saved to: ${
        resultPath || path.resolve(__dirname, "../downloads", filename)
      }`
    );
  } catch (err) {
    console.error("❌ Test failed:", err.message);
  }
})();
