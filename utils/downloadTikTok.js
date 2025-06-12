const axios = require("axios");
const fs = require("fs");
const path = require("path");
/**
 * Downloads a TikTok video without watermark using the TikWM API.
 * @param {string} videoUrl - The URL of the TikTok video to download.
 * @returns {Promise<void>}
 */

async function downloadTikTokVideo(videoUrl, filename) {
  const outputPath = path.resolve(__dirname, "../downloads", filename);
  
  // Check if file already exists
  if (fs.existsSync(outputPath)) {
    console.log(`File ${filename} already exists, skipping download.`);
    return;
  }

  try {
    // Step 1: get the video URL from TikWM API
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
    //Step 2: prepare local file stream
    const writer = fs.createWriteStream(outputPath);

    //Step 3: stream the video from url and save it to the local file
    const videoStream = await axios.get(tiktokUrl, {
      responseType: "stream", // Set response type to stream for downloading
    });
    videoStream.data.pipe(writer);

    // Step 4: wait for the download to finish
    return new Promise((resolve, reject) => {
      writer.on("finish", () => {
        console.log(`Video downloaded successfully: ${outputPath}`);
        resolve(outputPath);
      });
      writer.on("error", (error) => {
        console.error("Error writing file:", error.message);
        reject(error);
      });
    });
  } catch (error) {
    console.error("Error downloading TikTok video:", error.message);
    throw error;
  }
}

module.exports = {
  downloadTikTokVideo,
};
