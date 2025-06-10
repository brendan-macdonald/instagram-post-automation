const axios = require("axios");
require("dotenv").config();

async function getFacebookPage() {
  try {
    const response = await axios.get(
      `https://graph.facebook.com/v19.0/me/accounts`,
      {
        params: {
          access_token: process.env.FACEBOOK_ACCESS_TOKEN,
        },
      }
    );

    console.log("Pages:", response.data.data);
    return response.data.data[0].id;
  } catch (error) {
    console.error(
      "Error getting Facebook Page:",
      error.response?.data || error.message
    );
    throw error;
  }
}

async function getInstagramAccount(pageId) {
  try {
    const response = await axios.get(
      `https://graph.facebook.com/v19.0/${pageId}`,
      {
        params: {
          fields: "instagram_business_account",
          access_token: process.env.FACEBOOK_ACCESS_TOKEN,
        },
      }
    );

    console.log("Page details:", response.data);
    return response.data.instagram_business_account.id;
  } catch (error) {
    console.error(
      "Error getting Instagram Account:",
      error.response?.data || error.message
    );
    throw error;
  }
}

async function runTests() {
  try {
    console.log("\n=== Step 1: Getting Facebook Page ===");
    const pageId = await getFacebookPage();
    console.log("Successfully got Page ID:", pageId);

    console.log("\n=== Step 2: Getting Instagram Account ===");
    const instagramAccountId = await getInstagramAccount(pageId);
    console.log("Successfully got Instagram Account ID:", instagramAccountId);
  } catch (error) {
    console.error("Test failed:", error.message);
  }
}

runTests();
