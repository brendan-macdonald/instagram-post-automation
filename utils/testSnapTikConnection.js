//Loads the Puppeteer library, which lets you control a headless (or full) Chrome browser from code.
const puppeteer = require("puppeteer");

//Start an async block of code and run it immediately.
// / This is a self-invoking async function that allows us to use await inside it.
(async () => {
  //Launch a new browser instance with the headless option set to "new".
  //{ headless: false }: Makes it visible — so you can see what it’s doing.
  const browser = await puppeteer.launch({ headless: "false" });
  //If set to true, it runs in the background with no UI — like a bot.
  //The browser object lets you create tabs, close the browser, etc
  const page = await browser.newPage();
  //Navigates the browser to the SnapTik website.
  // waitUntil: "networkidle2" means:
  // Wait until at most 2 network connections are active
  // In other words: "wait until the page is done loading"
  // This ensures the site is fully loaded before we try to interact with it.
  await page.goto("https://snaptik.app", { waitUntil: "networkidle2" });

  const title = await page.title();
  //Get the title of the page
  console.log("Page title:", title);
  //Prints the title of the page to the console.

  await browser.close();
  //Closes the browser after we’re done.
  //This is important to free up system resources.
})();

//FULL FLOW
// Load Puppeteer
// Open Chrome (non-headless)
// Open a new tab
// Go to https://snaptik.app
// Wait for the page to finish loading
// Grab the page title
// Print it
// Close the browser
