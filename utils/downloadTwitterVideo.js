// Downloads a Twitter/X video using yt-dlp and returns the saved path + tweet text.
// utils/downloadTwitter.js
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const BIN = process.platform === "win32" ? "yt-dlp.exe" : "yt-dlp";

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

function findOutput(dir, base) {
  const mp4 = path.join(dir, `${base}.mp4`);
  if (fs.existsSync(mp4)) return mp4;
  const f = fs.readdirSync(dir).find((x) => x.startsWith(base + "."));
  return f ? path.join(dir, f) : null;
}

function normalizeTwitterUrl(u) {
  try {
    const url = new URL(u);
    if (url.hostname === "x.com") url.hostname = "twitter.com";
    return url.toString();
  } catch {
    return u.replace("://x.com/", "://twitter.com/");
  }
}

/** Download a Twitter/X video and return path + tweet text */
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
