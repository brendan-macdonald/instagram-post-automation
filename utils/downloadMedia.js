const { downloadTikTokVideo } = require("./downloadTikTok");
const { downloadTwitterVideo } = require("./downloadTwitterVideo");

async function downloadMedia(source, url, base) {
  if (source === "tiktok") {
    return await downloadTikTokVideo(url, base);
  } else if (source === "twitter") {
    return await downloadTwitterVideo(url, base);
  } else {
    throw new Error("Unknown media source: " + source);
  }
}

module.exports = { downloadMedia };