const ffmpegPath = require("ffmpeg-static");
const ffmpeg = require("fluent-ffmpeg");
const path = require("path");

ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(path.join(path.dirname(ffmpegPath), "ffprobe"));

function transcodeVideo(
  inputPath,
  outputPath,
  logoPath = null,
  withLogo = true
) {
  return new Promise((resolve, reject) => {
    let command = ffmpeg().input(inputPath);

    if (withLogo && logoPath) {
      command = command
        .input(logoPath)
        .complexFilter([
          // 1. Create white background
          "color=white:s=1080x1920:d=1[bg]",
          // 2. Scale logo
          "[1:v]scale=700:-1[logo]",
          // 3. Overlay logo onto background
          "[bg][logo]overlay=x=(main_w-820)/2:y=120[bgWithLogo]",
          // 4. Scale video, then speed up
          "[0:v]scale=820:-2, setpts=PTS/1.05[spedupv]",
          // 5. Overlay video centered on background
          "[bgWithLogo][spedupv]overlay=(W-w)/2:(H-h)/2+80[final]",
        ])
        .outputOptions(["-map", "[final]", "-map", "0:a?"]);
    } else {
      // No logo/background: just scale, pad, and speed up
      command = command
        .videoFilters([
          "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=white,setpts=PTS/1.05",
        ])
        .outputOptions(["-map", "0:v", "-map", "0:a?"]);
    }

    command
      .audioFilters("atempo=1.05")
      .outputOptions([
        "-c:v",
        "libx264",
        "-profile:v",
        "high",
        "-level",
        "4.0",
        "-pix_fmt",
        "yuv420p",
        "-preset",
        "fast",
        "-movflags",
        "+faststart",
        "-g",
        "48",
        "-keyint_min",
        "48",
        "-sc_threshold",
        "0",
        "-b:v",
        "2M",
        "-maxrate",
        "2M",
        "-bufsize",
        "4M",
        "-c:a",
        "aac",
        "-b:a",
        "128k",
        "-ar",
        "44100",
        "-ac",
        "2",
      ])
      .videoCodec("libx264")
      .audioCodec("aac")
      .duration(89)
      .on("stderr", (line) => {
        if (/error/i.test(line)) {
          console.error("[ffmpeg]", line);
        }
      })
      .on("end", () => resolve(outputPath))
      .on("error", (err) =>
        reject(new Error(`Error transcoding video: ${err.message}`))
      )
      .save(outputPath);
  });
}

module.exports = { transcodeVideo };
