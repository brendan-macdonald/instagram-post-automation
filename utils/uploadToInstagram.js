/**
 * uploadToInstagram.js
 * Handles uploading and publishing videos to an Instagram Business account using the Graph API.
 *
 * Exports:
 *   - uploadToInstagram: Uploads a video (served via Cloudflare) to Instagram Reels and publishes it.
 *
 * Usage:
 *   const { uploadToInstagram } = require("./uploadToInstagram");
 *   await uploadToInstagram("<cloudflare_url>", "video.mp4", "My caption", "<IG_ACCESS_TOKEN>", "<IG_USER_ID>");
 */

const axios = require("axios");

/**
 * Uploads and publishes a video to Instagram Reels using the Graph API.
 *
 * Workflow:
 *   1. Creates a media container with the video URL and caption.
 *   2. Waits briefly to allow Instagram to process the video.
 *   3. Polls Graph API until the video status is FINISHED.
 *   4. Publishes the video to the account.
 *
 * @param {string} cloudflareUrl - Public Cloudflare URL serving the local video files.
 * @param {string} filename - The name of the video file (e.g., "tiktok_20.mp4").
 * @param {string} caption - The caption text to include in the Instagram post.
 * @param {string} IG_ACCESS_TOKEN - Instagram access token for the account.
 * @param {string} IG_USER_ID - Instagram user ID for the account.
 * @returns {Promise<{success: boolean, id?: string, error?: string}>} Upload result.
 * @throws {Error} If creating the media container or publishing fails.
 */
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

  // 1) create video container
  let containerId;
  try {
    console.log("Creating video contianer...");
    console.log("Request payload:", {
      media_type: "REELS",
      video_url: videoUrl,
      caption: caption.substring(0, 100) + "...",
      access_token: IG_ACCESS_TOKEN ? "***PRESENT***" : "MISSING",
      user_id: IG_USER_ID,
    });

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
    console.log("Failed to create media container:");
    console.log("Status:", err.response?.status);
    console.log("Status Text:", err.response?.statusText);
    console.log("Error Data:", err.response?.data);
    console.log("Error Message:", err.message);
    console.log("Full Error:", JSON.stringify(err.response?.data, null, 2));
    throw err;
  }

  // ensure video is processed
  console.log("Waiting 10 seconds to ensure video is processing...");
  await new Promise((res) => setTimeout(res, 10000));

  console.log("Polling for Instagram to finish processing the video...");
  await waitForMediaReady(containerId, IG_ACCESS_TOKEN);
  console.log("Media is ready, publishing...");

  // 2) publish the video
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
    console.error(
      "Error publishing media:",
      error.response?.data || error.message
    );
    console.dir(error, { depth: null });
    return { success: false, error: error.message };
  }
}

/**
 * Polls the media container status until it's ready or max attempts are reached.
 *
 * @param {string} containerId - The ID of the media container.
 * @param {string} accessToken - Instagram Graph API access token.
 * @param {number} [maxAttempts=10] - Maximum number of polling attempts.
 * @param {number} [intervalMs=5000] - Delay between polling attempts in ms.
 * @returns {Promise<boolean>} Resolves true if media is ready; rejects if error or timeout.
 * @throws {Error} If processing fails or never finishes within max attempts.
 */
async function waitForMediaReady(
  containerId,
  accessToken,
  maxAttempts = 10,
  intervalMs = 5000
) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(
        `Checking media status (attempt ${attempt}/${maxAttempts})...`
      );
      const res = await axios.get(
        `https://graph.facebook.com/v19.0/${containerId}?fields=status_code&access_token=${accessToken}`
      );
      console.log(`Graph API Response:`, res.data);

      if (res.data.status_code === "FINISHED") {
        console.log("✅ Media processing finished successfully");
        return true;
      }

      if (res.data.status_code === "ERROR") {
        console.log("❌ Media processing failed with status: ERROR");
        throw new Error(
          `Media processing failed with status: ${res.data.status_code}`
        );
      }

      console.log(
        `Media not ready (status: ${res.data.status_code}), waiting... (${attempt}/${maxAttempts})`
      );
      await new Promise((r) => setTimeout(r, intervalMs));
    } catch (error) {
      console.log(`❌ Error checking media status (attempt ${attempt}):`);
      console.log("Status:", error.response?.status);
      console.log("Status Text:", error.response?.statusText);
      console.log("Error Data:", error.response?.data);
      console.log("Error Message:", error.message);
      throw error;
    }
  }
  throw new Error("Media not ready after polling.");
}

module.exports = { uploadToInstagram };
