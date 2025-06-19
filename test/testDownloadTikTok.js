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
