/**
 * testTranscodePresets.js
 * Command-line test script for experimenting with different video transcode presets.
 *
 * Behavior:
 *   - Accepts a preset, input video path, output path, and optional logo/caption arguments.
 *   - Invokes `transcodeVideo` with the chosen configuration.
 *   - Allows testing of different output styles (raw, logo overlay, caption at top).
 *   - Logs success or failure with details about the resulting file.
 *
 * Preset Options (see `utils/transcodeVideo.js` for implementation):
 *   - "raw"         : Scales/pads video to 1080x1920, applies slight playback speedup (1.05x). No overlays.
 *   - "logo_only"   : Places a logo image near the top of the canvas, positions video below it.
 *   - "caption_top" : Adds a caption bar at the top with text (from `caption_strategy`) and positions video below.
 *
 * Caption Strategy Options:
 *   - "default"     : Use the fallback caption (from env `CAPTION` if available, else empty).
 *   - "custom"      : Use the text in the `caption_custom` argument.
 *   - "from_source" : Use the caption provided by the source (e.g., tweet text). Falls back to default if empty.
 *
 * Logo Option:
 *   - Provide a valid image path (e.g., `./assets/zerotobuilt.jpg`) if the preset requires an overlay.
 *   - Use an empty string to disable logo overlay.
 *
 * Usage examples (WSL):
 *   node test/testTranscodePresets.js raw ./downloads/twitter_test.mp4 ./downloads/out_raw.mp4
 *   node test/testTranscodePresets.js logo_only ./downloads/twitter_test.mp4 ./downloads/out_logo.mp4 ./assets/zerotobuilt.jpg
 *   node test/testTranscodePresets.js caption_top ./downloads/twitter_test.mp4 ./downloads/out_caption.mp4 "" "" "This is a caption from Twitter"
 *   node test/testTranscodePresets.js caption_top ./downloads/twitter_test.mp4 ./downloads/out_caption_custom.mp4 "" custom "My custom caption"
 *
 * Exports:
 *   - (none) — this is a standalone test script.
 */

const path = require("path");
const { transcodeVideo } = require("../utils/transcodeVideo");

// CLI args
const preset = process.argv[2] || "raw";
const inputPath = path.resolve(
  process.argv[3] || "./downloads/zerotobuilt_media_2.mp4"
);
const outputPath = path.resolve(process.argv[4] || "./downloads/output.mp4");
const captionStrategy = process.argv[6] || "custom"; // default to tweet text
const captionCustom =
  process.argv[7] ||
  "this is a test caption to see if the video correctly wraps the text after transcoding";
const sourceCaption = process.argv[8] || process.env.CAPTION || "";
// Force a default logo path (still override if CLI arg provided)
const defaultLogo = path.resolve("./assets/zerotobuilt.jpg");
const logoPath = process.argv[5] ? path.resolve(process.argv[5]) : defaultLogo;

// Call signature stays compatible with your old code:
// transcodeVideo(inputPath, outputPath, logoPath, withLogo, options)
transcodeVideo(inputPath, outputPath, logoPath, !!logoPath, {
  preset,
  caption_strategy: captionStrategy,
  caption_custom: captionCustom,
  source_caption: sourceCaption,
})
  .then(() => console.log(`✅ Transcoded (${preset}) -> ${outputPath}`))
  .catch((err) => {
    console.error("❌ Transcoding failed:", err.message);
    process.exit(1);
  });
