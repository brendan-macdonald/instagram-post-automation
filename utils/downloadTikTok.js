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
    console.log("Response:", response.data);
    // Check if the response contains the video URL
    console.dir(response.data, { depth: null });
  } catch (error) {
    console.error("Error downloading TikTok video:", error.message);
  }
}

module.exports = {
  downloadTikTokVideo,
};
