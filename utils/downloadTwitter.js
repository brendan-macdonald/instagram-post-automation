// Downloads a Twitter/X video using yt-dlp and returns the saved path + tweet text.
// Prereq: install yt-dlp and ensure it's on PATH
//   macOS/Linux:  pipx install yt-dlp   (or)  brew install yt-dlp
//   Windows: download yt-dlp.exe and put the folder in PATH

const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

/**
 * @param {string} tweetUrl - The Twitter/X URL
 * @param {string} outBasename - File base name without extension (e.g. "twitter_42")
 * @param {string} accountName - For logs
 * @returns {Promise<{videoPath: string, caption: string}>}
 */
async function downloadTwitterVideo(
  tweetUrl,
  outBasename,
  accountName = "unknown"
) {
  const downloadsDir = path.resolve(__dirname, "../downloads");
  if (!fs.existsSync(downloadsDir))
    fs.mkdirSync(downloadsDir, { recursive: true });

  const outTemplate = path.join(downloadsDir, `${outBasename}.%(ext)s`);

  // 1) Get metadata (title is tweet text)
  const meta = await runYtDlp(["-J", tweetUrl]);
  const caption = (meta?.title || "").trim();

  // 2) Download best MP4
  const args = [
    "-f",
    "mp4/best", // prefer mp4
    "-o",
    outTemplate, // output template
    "--no-playlist",
    "--no-warnings",
    tweetUrl,
  ];

  console.log(`[${accountName}] yt-dlp downloading: ${tweetUrl}`);
  await runYtDlp(args);

  // 3) Resolve the file we just wrote
  const videoPath = resolveDownloadedFile(downloadsDir, outBasename);
  if (!videoPath)
    throw new Error("Downloaded file not found (check yt-dlp PATH and URL).");

  console.log(`[${accountName}] Saved: ${videoPath}`);
  return { videoPath, caption };
}

function runYtDlp(args) {
  return new Promise((resolve, reject) => {
    const proc = spawn("yt-dlp", args);
    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (d) => (stdout += d.toString()));
    proc.stderr.on("data", (d) => (stderr += d.toString()));

    proc.on("close", (code) => {
      if (code !== 0) {
        return reject(
          new Error(`yt-dlp exited with ${code}\n${stderr || stdout}`)
        );
      }
      // If we asked for JSON (-J), parse it:
      if (args.includes("-J")) {
        try {
          return resolve(JSON.parse(stdout));
        } catch {
          // Some URLs may print non-JSON first; fallback to success anyway
          return resolve({});
        }
      }
      resolve(true);
    });
  });
}

function resolveDownloadedFile(dir, basename) {
  // Find a file that matches "<basename>.<ext>", prefer .mp4
  const files = fs.readdirSync(dir).filter((f) => f.startsWith(basename + "."));
  const mp4 = files.find((f) => f.toLowerCase().endsWith(".mp4"));
  return mp4 ? path.join(dir, mp4) : files[0] ? path.join(dir, files[0]) : null;
}

module.exports = { downloadTwitterVideo };
