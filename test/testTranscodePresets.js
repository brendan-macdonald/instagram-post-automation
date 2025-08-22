// Usage examples (WSL):
//   node test/testTranscodePresets.js raw ./downloads/twitter_test.mp4 ./downloads/out_raw.mp4
//   node test/testTranscodePresets.js logo_only ./downloads/twitter_test.mp4 ./downloads/out_logo.mp4 ./assets/zerotobuilt.jpg
//   node test/testTranscodePresets.js caption_top ./downloads/twitter_test.mp4 ./downloads/out_caption.mp4 "" "" "This is a caption from Twitter"
// Or with caption_strategy/custom:
//   node test/testTranscodePresets.js caption_top ./downloads/twitter_test.mp4 ./downloads/out_caption_custom.mp4 "" custom "My custom caption"

const path = require("path");
const { transcodeVideo } = require("../utils/transcodeVideo");

// CLI args
const preset = process.argv[2] || "raw";
const inputPath = path.resolve(
  process.argv[3] || "./downloads/twitter_test.mp4"
);
const outputPath = path.resolve(process.argv[4] || "./downloads/out_test.mp4");
const logoPath = process.argv[5] ? path.resolve(process.argv[5]) : null;
const captionStrategy = process.argv[6] || "from_source"; // default to tweet text
const captionCustom = process.argv[7] || "";
const sourceCaption = process.argv[8] || process.env.CAPTION || "";

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
