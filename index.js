const { downloadTikTokVideo } = require("./utils/downloadTikTok");

const testUrl = "https://www.tiktok.com/@mrbeast/video/7505849400019717406";
const outputFilename = "test_video.mp4";

downloadTikTokVideo(testUrl, outputFilename);
