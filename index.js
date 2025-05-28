const { downloadTikTokVideo } = require("./utils/downloadTikTok");

(async () => {
  const videoUrl = "https://www.tiktok.com/@example/video/1234567890"; // Replace with your TikTok video URL
  const outputPath = "downloads/test.mp4"; // Path where you want to save the video
  await downloadTikTokVideo(videoUrl, outputPath);
  console.log("Video downloaded successfully!");
})();
