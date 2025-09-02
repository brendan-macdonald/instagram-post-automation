/**
 * downloadTwitterVideo.js
 * Module for downloading videos from Twitter/X using yt-dlp and extracting tweet text.
 *
 * Exports:
 *   - downloadTwitterVideo: Downloads a Twitter/X video from a given URL and returns the saved file path along with the tweet text.
 *
 * Usage:
 *   const { downloadTwitterVideo } = require("./downloadTwitterVideo");
 *   const { videoPath, caption } = await downloadTwitterVideo("<tweet_url>", "myvideo");
 */

const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const BIN = process.platform === "win32" ? "yt-dlp.exe" : "yt-dlp";

/**
 * Runs a shell command asynchronously and captures output.
 *
 * @param {string} cmd - The command to run (e.g., "yt-dlp").
 * @param {string[]} args - Arguments for the command.
 * @param {Object} [options] - Optional settings.
 * @param {boolean} [options.parseJson=false] - Whether to parse the stdout as JSON.
 * @returns {Promise<string|Object>} Resolves with command output (string or parsed JSON).
 * @throws {Error} If the process exits with a non-zero code.
 */
function run(cmd, args, { parseJson = false } = {}) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args);
    let out = "",
      err = "";
    p.stdout.on("data", (d) => (out += d));
    p.stderr.on("data", (d) => (err += d));
    p.on("error", reject);
    p.on("close", (code) => {
      if (code !== 0) return reject(new Error(err || out || `exit ${code}`));
      if (parseJson) {
        try {
          return resolve(JSON.parse(out));
        } catch {
          return resolve({});
        }
      }
      resolve(out);
    });
  });
}

/**
 * Finds the output file in the given directory based on the base filename.
 *
 * @param {string} dir - Directory to search for output.
 * @param {string} base - Base filename (without extension).
 * @returns {string|null} Path to the found file, or null if not found.
 */
function findOutput(dir, base) {
  const mp4 = path.join(dir, `${base}.mp4`);
  if (fs.existsSync(mp4)) return mp4;
  const f = fs.readdirSync(dir).find((x) => x.startsWith(base + "."));
  return f ? path.join(dir, f) : null;
}

/**
 * Normalizes Twitter/X URLs so they always use "twitter.com".
 *
 * @param {string} u - The original URL (may be x.com or twitter.com).
 * @returns {string} Normalized Twitter URL.
 */
function normalizeTwitterUrl(u) {
  try {
    const url = new URL(u);
    if (url.hostname === "x.com") url.hostname = "twitter.com";
    return url.toString();
  } catch {
    return u.replace("://x.com/", "://twitter.com/");
  }
}

/**
 * Downloads a Twitter/X video and returns the saved file path along with the tweet text.
 *
 * @param {string} url - The URL of the tweet containing the video.
 * @param {string} base - Base filename (without extension) for the downloaded file.
 * @returns {Promise<{videoPath: string, caption: string}>} Resolves with the video path and tweet caption.
 * @throws {Error} If the video cannot be downloaded or output file is not found.
 */
async function downloadTwitterVideo(url, base) {
  url = normalizeTwitterUrl(url);
  const dlDir = path.resolve(__dirname, "../downloads");
  fs.mkdirSync(dlDir, { recursive: true });
  const template = path.join(dlDir, `${base}.%(ext)s`);

  // 1) get tweet text
  const meta = await run(BIN, ["-J", url], { parseJson: true });
  const fullTitle = (meta?.title || "").trim();
  const dashIndex = fullTitle.indexOf(" - ");
  const caption =
    dashIndex !== -1 ? fullTitle.substring(dashIndex + 3).trim() : fullTitle;

  // 2) download (ensure mp4 output)
  await run(BIN, [
    "-o",
    template,
    "--merge-output-format",
    "mp4",
    "--no-playlist",
    "--no-warnings",
    url,
  ]);

  // 3) return file
  const videoPath = findOutput(dlDir, base);
  if (!videoPath) throw new Error("yt-dlp finished but output not found");
  return { videoPath, caption };
}

module.exports = { downloadTwitterVideo };
