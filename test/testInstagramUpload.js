/**
 * testInstagramUpload.js
 * Diagnostic script to verify Instagram Graph API integration by uploading and publishing a test photo.
 *
 * Behavior:
 *   - Step 1: Tests connection to the Instagram Business account via Graph API.
 *   - Step 2: Uploads an image to an Instagram media container (not published yet).
 *   - Step 3: Publishes the uploaded media to the Instagram account.
 *   - Logs responses or errors at each step for debugging.
 *
 * Exports:
 *   - (none) — this is a standalone test script.
 *
 * Environment Variables (required):
 *   - IG_ACCESS_TOKEN : Instagram Graph API access token.
 *   - IG_USER_ID      : Instagram Business account ID.
 *
 * Usage:
 *   node db/testInstagramUpload.js
 *
 * Notes:
 *   - Intended only for testing connectivity and publishing flow with Instagram Graph API.
 *   - Update the `imageUrl` and `caption` in the script to test with your own media.
 */

const axios = require("axios");
const { response } = require("express");
require("dotenv").config(); // use variables from .env

// load credentials from .env file
const IG_ACCESS_TOKEN = process.env.IG_ACCESS_TOKEN;
const IG_USER_ID = process.env.IG_USER_ID;

if (!IG_ACCESS_TOKEN || !IG_USER_ID) {
  console.error("Missing IG_ACCESS_TOKEN or IG_USER_ID in .env");
  process.exit(1);
}

// (1) test connection to instagram graph api
async function testConnection() {
  try {
    console.log("testing instagram graph api connection...");

    const response = await axios.get(
      `https://graph.facebook.com/v19.0/${IG_USER_ID}?fields=name&access_token=${IG_ACCESS_TOKEN}`
    );

    console.log("Connected to instagram business account:", response.data.name);
  } catch (err) {
    console.error(
      "Failed to connect to Instagram:",
      err.response?.data || err.message
    );
    process.exit(1);
  }
}

// (2) Upload photo to instagram container (without publishing yet)
async function uploadPhoto(imageUrl, caption) {
  try {
    console.log("uploading image to instagram container...");

    const response = await axios.post(
      `https://graph.facebook.com/v19.0/${IG_USER_ID}/media`,
      {
        image_url: imageUrl,
        caption,
        access_token: IG_ACCESS_TOKEN,
      }
    );

    console.log("Media container created:", response.data.id);
    return response.data.id;
  } catch (err) {
    console.log("Failed to upload media:", err.response?.data || err.message);
    process.exit(1);
  }
}

// (3) Publish uploaded media
async function publishMedia(containerId) {
  try {
    console.log("Publishing media...");

    const response = await axios.post(
      `https://graph.facebook.com/v19.0/${IG_USER_ID}/media_publish`,
      {
        creation_id: containerId,
        access_token: IG_ACCESS_TOKEN,
      }
    );

    console.log("Media published with ID:", response.data.id);
  } catch (err) {
    console.log("Failed to publish media:", err.response?.data || err.message);
    process.exit(1);
  }
}

// running the full test flow
(async () => {
  await testConnection();

  const imageUrl =
    "https://media.istockphoto.com/id/527617369/photo/crowded-istiklal-street-in-istanbul.jpg?s=612x612&w=0&k=20&c=lhbrVOISZFf7oYJ0i2UUwStm1mgFC9eaIfno=";
  const caption = "Test instagram graph api with node.js 2";

  const containerId = await uploadPhoto(imageUrl, caption);
  await publishMedia(containerId);
})();
