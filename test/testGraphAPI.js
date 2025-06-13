const axios = require("axios");
require("dotenv").config();

// Step 1: Get Facebook Page ID
async function getFacebookPage() {
  try {
    const response = await axios.get(
      `https://graph.facebook.com/v19.0/me/accounts`,
      {
        params: {
          access_token: process.env.IG_ACCESS_TOKEN,
        },
      }
    );
    console.log("Available Pages:", response.data.data);
    return response.data.data[0].id;
  } catch (error) {
    console.error(
      "Error getting Facebook Page:",
      error.response?.data || error.message
    );
    throw error;
  }
}

// Step 2: Get Instagram Business Account ID
async function getInstagramAccount(pageId) {
  try {
    const response = await axios.get(
      `https://graph.facebook.com/v19.0/${pageId}`,
      {
        params: {
          fields: "instagram_business_account",
          access_token: process.env.IG_ACCESS_TOKEN,
        },
      }
    );
    console.log("Page Details:", response.data);
    return response.data.instagram_business_account.id;
  } catch (error) {
    console.error(
      "Error getting Instagram Account:",
      error.response?.data || error.message
    );
    throw error;
  }
}

// Step 3: Get Account Info
async function getAccountInfo(instagramAccountId) {
  try {
    const response = await axios.get(
      `https://graph.facebook.com/v19.0/${instagramAccountId}`,
      {
        params: {
          fields: "username,profile_picture_url,followers_count,media_count",
          access_token: process.env.IG_ACCESS_TOKEN,
        },
      }
    );
    console.log("Account Info:", response.data);
    return response.data;
  } catch (error) {
    console.error(
      "Error getting Account Info:",
      error.response?.data || error.message
    );
    throw error;
  }
}

// Test each step individually
async function runTests() {
  try {
    console.log("\n=== Step 1: Getting Facebook Page ===");
    const pageId = await getFacebookPage();
    console.log("Successfully got Page ID:", pageId);

    console.log("\n=== Step 2: Getting Instagram Account ===");
    const instagramAccountId = await getInstagramAccount(pageId);
    console.log("Successfully got Instagram Account ID:", instagramAccountId);

    console.log("\n=== Step 3: Getting Account Info ===");
    const accountInfo = await getAccountInfo(instagramAccountId);
    console.log("Successfully got Account Info");
  } catch (error) {
    console.error("Test failed:", error.message);
  }
}

// Run the tests
runTests();
