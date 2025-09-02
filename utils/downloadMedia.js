/**
 * downloadMedia.js
 * Utility module for downloading media from different social platforms.
 *
 * Exports:
 *   - downloadMedia: Downloads a video from a given source (TikTok or Twitter) using the corresponding downloader.
 *
 * Usage:
 *   const { downloadMedia } = require("./downloadMedia");
 *   await downloadMedia("tiktok", "<video_url>", "<base_path>");
 */

const { downloadTikTokVideo } = require("./downloadTikTok");
const { downloadTwitterVideo } = require("./downloadTwitterVideo");

/**
 * Downloads a video from the given source platform.
 *
 * @param {string} source - The platform ("tiktok" | "twitter").
 * @param {string} url - The video URL to download.
 * @param {string} base - Base path or directory where the file will be saved.
 * @returns {Promise<string>} Resolves with the saved file path.
 * @throws {Error} If the source is not recognized.
 */
async function downloadMedia(source, url, base) {
  if (source === "tiktok") {
    return await downloadTikTokVideo(url, base);
  } else if (source === "twitter") {
    return await downloadTwitterVideo(url, base);
  } else {
    throw new Error("Unknown media source: " + source);
  }
}

module.exports = { downloadMedia };
