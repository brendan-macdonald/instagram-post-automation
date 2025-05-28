const axios = require("axios");

async function downloadTikTokVideo(videoUrl) {
  try {
    // Make a GET request to the TikTok video URL
    const response = await axios.get("https://tikwm.com/api/", {
      params: {
        url: videoUrl,
        no_watermark: true, // Set to true to download without watermark
      },
    });

    const tiktokUrl = response.data?.data?.play; // Extract the video URL from the response

    if (!tiktokUrl) {
      throw new Error("Video URL not found in the response.");
    }

    console.log("Video URL:", tiktokUrl);
  } catch (error) {
    console.error("Error downloading TikTok video:", error.message);
  }
}

module.exports = {
  downloadTikTokVideo,
};
