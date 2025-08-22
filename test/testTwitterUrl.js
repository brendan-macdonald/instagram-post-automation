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
