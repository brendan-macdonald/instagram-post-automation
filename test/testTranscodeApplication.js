// const path = require("path");
// const { transcodeVideo } = require("../utils/testTranscodeVideo");

// (async () => {
//   try {
//     await transcodeVideo(
//       "./downloads/test_video.mp4", // Your raw TikTok video
//       "./downloads/processed_video1_out.mp4", // Final IG-friendly output
//       "./assets/logo.jpg" // Your branding logo
//     );
//     console.log("✅ Transcoding complete.");
//   } catch (err) {
//     console.error(err);
//   }
// })();

const path = require("path");
const { transcodeVideo } = require("../utils/transcodeVideo");

const inputPath = path.resolve(__dirname, "../downloads/tiktok_170.mp4");
const outputPath = path.resolve(
  __dirname,
  "../downloads/sample_transcoded.mp4"
);
const logoPath = path.resolve(__dirname, "../assets/zerotobuilt.jpg"); // Adjust path if needed

transcodeVideo(inputPath, outputPath, logoPath)
  .then(() => console.log("✅ Video transcoded successfully."))
  .catch((err) => console.error("❌ Transcoding failed:", err));
