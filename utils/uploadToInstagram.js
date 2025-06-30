//Uses CLOUDFLARE_PUBLIC_URL and video filename to construct a public video URL.
//Creates a video container using the Instagram Graph API.
//Waits 10 seconds to allow Instagram to process the video.
//Publishes the video to Instagram Business account
const axios = require("axios");

//function uploads and publishes a video to reels using the graph api
// @param {string} cloudflareUrl - The public cloudflareUrl serving the local video files
// @param {string} filename - The name of the video file (e.g., tiktok_20.mp4)
// @param {string} caption - The caption text to include in the Instagram post
// @param {string} IG_ACCESS_TOKEN - Instagram access token for this account
// @param {string} IG_USER_ID - Instagram user ID for this account

async function uploadToInstagram(
  cloudflareUrl,
  filename,
  caption,
  IG_ACCESS_TOKEN,
  IG_USER_ID
) {
  if (!IG_ACCESS_TOKEN || !IG_USER_ID) {
    throw new Error("Missing IG_ACCESS_TOKEN or IG_USER_ID for this account.");
  }
  const videoUrl = `${cloudflareUrl}/downloads/${filename}`;
  console.log("Video url:", videoUrl);

  //1) create video container
  let containerId;
  try {
    console.log("Creating video contianer...");
    const containerResponse = await axios.post(
      `https://graph.facebook.com/v19.0/${IG_USER_ID}/media`,
      {
        media_type: "REELS",
        video_url: videoUrl,
        caption,
        access_token: IG_ACCESS_TOKEN,
      }
    );

    containerId = containerResponse.data.id;
    console.log("Media container created:", containerId);
  } catch (err) {
    console.log(
      "Failed to create media container:",
      err.response?.data || err.message
    );
    throw err;
  }

  //ensure video is processed
  console.log("Waiting 10 seconds to ensure video is processing...");
  await new Promise((res) => setTimeout(res, 10000));

  // After containerId = containerResponse.data.id;
  console.log("Polling for Instagram to finish processing the video...");
  await waitForMediaReady(containerId, IG_ACCESS_TOKEN);
  console.log("Media is ready, publishing...");

  //2) publish the video
  try {
    console.log("Publishing media to instagram...");
    const publishResponse = await axios.post(
      `https://graph.facebook.com/v19.0/${IG_USER_ID}/media_publish`,
      {
        creation_id: containerId,
        access_token: IG_ACCESS_TOKEN,
      }
    );

    console.log(
      "Video published successfully with ID:",
      publishResponse.data.id
    );
    return { success: true, id: publishResponse.data.id };
  } catch (error) {
    console.error("Error publishing media:", error);
    return { success: false, error: error.message };
  }
}

// Polls the media container status until it's ready or the max attempts are reached
// @param {string} containerId - The ID of the media container
// @param {string} accessToken - The access token for Instagram Graph API
// @param {number} maxAttempts - The maximum number of polling attempts (default: 10)
// @param {number} intervalMs - The interval between polling attempts in milliseconds (default: 5000)

async function waitForMediaReady(
  containerId,
  accessToken,
  maxAttempts = 10,
  intervalMs = 5000
) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const res = await axios.get(
      `https://graph.facebook.com/v19.0/${containerId}?fields=status_code&access_token=${accessToken}`
    );
    console.log(`Graph API Response:`, res.data);
    if (res.data.status_code === "FINISHED") {
      return true;
    }
    console.log(
      `Media not ready (status: ${res.data.status_code}), waiting... (${attempt}/${maxAttempts})`
    );
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error("Media not ready after polling.");
}

module.exports = { uploadToInstagram };
