// Usage: node tests/testTwitterUrl.js "<tweet_url>" [basename]
const { downloadTwitterVideo } = require("../utils/downloadTwitter");

const url = process.argv[2];
const basename = process.argv[3] || "twitter_test";
if (!url) {
  console.log(
    'Use: node tests/testTwitterUrl.js "https://x.com/user/status/..." [basename]'
  );
  process.exit(1);
}

(async () => {
  try {
    const { videoPath, caption } = await downloadTwitterVideo(
      url,
      basename,
      "twitter-url-test"
    );
    console.log("✅ Saved:", videoPath);
    console.log("Caption:", caption);
  } catch (e) {
    console.error("❌ Failed:", e.message);
    process.exit(1);
  }
})();
