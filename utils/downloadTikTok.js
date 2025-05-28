const puppeteer = require("puppeteer");
// const fs = require('fs');
// const https = require('https');
// const path = require('path');

// Step 1: Open snapTik.app and print the page title
async function downloadTikTokVideo(url, outputPath) {
  const browser = await puppeteer.launch({ headless: "false" });
  const page = await browser.newPage();

  console.log("Navigating to snaptik.app...");
  await page.goto("https://snaptik.app", {
    waitUntil: "networkidle2",
    timeout: 0,
  });

  const title = await page.title();
  console.log("Page title:", title);
  await browser.close();
}

module.exports = { downloadTikTokVideo };
