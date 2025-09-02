/**
 * testTranscodeApplications.js
 * Test script for verifying the video transcoding pipeline using `transcodeVideo`.
 *
 * Behavior:
 *   - Loads a sample video file from the local `downloads` directory.
 *   - Transcodes the video into a 1080x1920 canvas with optional logo/caption overlays,
 *     depending on the preset and provided logo.
 *   - Saves the transcoded output as `sample_transcoded.mp4` in the `downloads` directory.
 *   - Logs success or failure to the console.
 *
 * Exports:
 *   - (none) — this is a standalone test script.
 *
 * Usage:
 *   node db/testTranscodeApplications.js
 *
 * Notes:
 *   - Update `inputPath` to point to a valid downloaded media file.
 *   - Update `logoPath` to a valid logo image if testing presets that require an overlay (e.g., "logo_only").
 *   - The transcode logic is defined in `utils/transcodeVideo.js`, which applies scaling, padding,
 *     optional captions, and logo overlays before producing the final file.
 */

const path = require("path");
const { transcodeVideo } = require("../utils/transcodeVideo");

const inputPath = path.resolve(__dirname, "../downloads/tiktok_170.mp4"); // Adjust input file path as needed
const outputPath = path.resolve(
  __dirname,
  "../downloads/sample_transcoded.mp4"
);
const logoPath = path.resolve(__dirname, "../assets/zerotobuilt.jpg"); // Adjust logo path as needed

transcodeVideo(inputPath, outputPath, logoPath)
  .then(() => console.log("✅ Video transcoded successfully."))
  .catch((err) => console.error("❌ Transcoding failed:", err));
