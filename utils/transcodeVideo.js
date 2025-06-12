const ffmpegPath = require("ffmpeg-static");
const ffmpeg = require("fluent-ffmpeg");
const path = require("path");

// Set ffmpeg path
ffmpeg.setFfmpegPath(ffmpegPath);

// Set ffprobe path (it's in the same directory as ffmpeg)
const ffprobePath = path.join(path.dirname(ffmpegPath), 'ffprobe');
ffmpeg.setFfprobePath(ffprobePath);

function transcodeVideo(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .outputOptions([
        "-c:v libx264", // H.264 codec
        "-profile:v high", // Profile required
        "-level 4.0", // Level required
        "-pix_fmt yuv420p", // Chroma subsampling
        "-preset fast", // Encoding speed/quality tradeoff
        "-movflags +faststart", // moov atom at the beginning
        "-g 48", // Closed GOP (~2s @ 24fps)
        "-keyint_min 48", // Keyframe interval matches GOP
        "-sc_threshold 0", // Force keyframe interval
        "-b:v 2M", // Bitrate <= 25Mbps, 2M is safe
        "-maxrate 2M",
        "-bufsize 4M",
        "-c:a aac", // AAC audio
        "-b:a 128k",
        "-ar 44100", // 44.1kHz
        "-ac 2", // Stereo
      ])
      .videoCodec("libx264")
      .audioCodec("aac")
      .duration(89) // safer limit
      .on("end", () => resolve(outputPath))
      .on("error", (err) =>
        reject(new Error(`Error transcoding video: ${err.message}`))
      )
      .save(outputPath);
  });
}

module.exports = { transcodeVideo };
