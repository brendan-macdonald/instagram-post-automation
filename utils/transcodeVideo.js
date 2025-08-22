const fs = require("fs");
const os = require("os");
const path = require("path");
const ffmpeg = require("fluent-ffmpeg");

const FFMPEG_PATH = process.env.FFMPEG_PATH || "/usr/bin/ffmpeg";
const FFPROBE_PATH = process.env.FFPROBE_PATH || "/usr/bin/ffprobe";

ffmpeg.setFfmpegPath(FFMPEG_PATH);
ffmpeg.setFfprobePath(FFPROBE_PATH);

const CANVAS_W = 1080;
const CANVAS_H = 1920;

function resolveCaption({
  caption_strategy,
  caption_custom,
  source_caption,
  default_caption,
}) {
  const fallback = (default_caption || "").trim();

  if (caption_strategy === "custom") {
    return (caption_custom || "").trim() || fallback;
  }
  if (caption_strategy === "from_source") {
    return (source_caption || "").trim() || fallback;
  }
  return fallback;
}

async function ffprobeVideoSize(inputPath) {
  return new Promise((resolve) => {
    ffmpeg.ffprobe(inputPath, (err, data) => {
      if (err) return resolve({ width: 0, height: 0 });
      const st = (data.streams || []).find((s) => s.codec_type === "video");
      if (!st) return resolve({ width: 0, height: 0 });
      resolve({
        width: Number(st.width || 0),
        height: Number(st.height || 0),
      });
    });
  });
}

async function probeAspect(inputPath) {
  return new Promise((resolve) => {
    ffmpeg.ffprobe(inputPath, (err, data) => {
      if (err) return resolve({ is916: false });
      const st = (data.streams || []).find((s) => s.codec_type === "video");
      if (!st) return resolve({ is916: false });
      const w = Number(st.width || 0);
      const h = Number(st.height || 0);
      const target = 9 / 16;
      resolve({ is916: w && h ? Math.abs(w / h - target) < 0.01 : false });
    });
  });
}

/**
 * Compute scaled video placement.
 * - If ~9:16: pin under the top strip.
 * - Otherwise: place slightly higher than center (1/3 offset).
 */
function computeScaledLayout(srcW, srcH, is916, topStrip) {
  const availW = CANVAS_W;
  const availH = CANVAS_H - topStrip;

  const scale = Math.min(availW / srcW, availH / srcH);
  const outVideoW = Math.round(srcW * scale);
  const outVideoH = Math.round(srcH * scale);

  const x = Math.round((CANVAS_W - outVideoW) / 2);
  const y = is916 ? topStrip : topStrip + Math.round((availH - outVideoH) / 3); // 2/3 positioning

  return { outVideoW, outVideoH, x, y };
}

function safeFilterPath(p) {
  return p.replace(/\\/g, "/").replace(/'/g, "\\'");
}

function buildAssCaptionFile({
  text,
  fontFamily = "DejaVu Sans",
  fontSize = 48,
  bottomOfCaptionY,
  videoLeftRightMargin,
}) {
  const marginV = Math.max(0, CANVAS_H - bottomOfCaptionY);
  const marginLR = Math.max(0, Math.round(videoLeftRightMargin));

  const assText =
    (text || "")
      .replace(/\r/g, "")
      .replace(/\n{2,}/g, "\n")
      .trim()
      .replace(/\n/g, "\\N") || "";

  const header = [
    "[Script Info]",
    "ScriptType: v4.00+",
    `PlayResX: ${CANVAS_W}`,
    `PlayResY: ${CANVAS_H}`,
    "ScaledBorderAndShadow: yes",
    "",
    "[V4+ Styles]",
    "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
    `Style: Caption,${fontFamily},${fontSize},&H00000000,&H00000000,&H00000000,&H00FFFFFF,0,0,0,0,100,100,0,0,1,0,0,2,${marginLR},${marginLR},${marginV},0`,
    "",
    "[Events]",
    "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
    `Dialogue: 0,0:00:00.00,9:59:59.00,Caption,,0,0,0,,${assText}`,
    "",
  ].join("\n");

  const tmp = path.join(
    os.tmpdir(),
    `caption_${Date.now()}_${Math.random().toString(36).slice(2)}.ass`
  );
  fs.writeFileSync(tmp, header, "utf8");
  return tmp;
}

function transcodeVideo(
  inputPath,
  outputPath,
  logoPath = null,
  withLogo = true,
  options = {}
) {
  const {
    preset = withLogo && logoPath ? "logo_only" : "raw",
    caption_strategy = "default",
    caption_custom = "",
    source_caption = "",
    fontFamily = "DejaVu Sans",
    fontSize = 48,
    topStrip = 240,
    captionBottomMargin = 12,
  } = options;

  return new Promise(async (resolve, reject) => {
    let assPath = null;

    try {
      let command = ffmpeg().input(inputPath);

      const { is916 } = await probeAspect(inputPath);
      const { width: srcW0, height: srcH0 } = await ffprobeVideoSize(inputPath);
      const srcW = srcW0 || CANVAS_W;
      const srcH = srcH0 || CANVAS_H;

      const {
        outVideoW,
        outVideoH,
        x: vidX,
        y: vidY,
      } = computeScaledLayout(srcW, srcH, is916, topStrip);

      const chosenCaption = resolveCaption({
        caption_strategy,
        caption_custom,
        source_caption,
        default_caption: options.default_caption,
      });

      if (preset !== "raw") {
        const videoLRMargin = (CANVAS_W - outVideoW) / 2;
        const bottomOfCaptionY = vidY - captionBottomMargin;

        assPath = buildAssCaptionFile({
          text: chosenCaption,
          fontFamily,
          fontSize,
          bottomOfCaptionY,
          videoLeftRightMargin: videoLRMargin,
        });
      }

      const videoScale = `scale=${outVideoW}:${outVideoH}:force_original_aspect_ratio=decrease`;

      if (
        preset === "logo_only" &&
        withLogo &&
        logoPath &&
        fs.existsSync(logoPath)
      ) {
        command = command
          .input(logoPath)
          .complexFilter([
            `color=white:s=${CANVAS_W}x${CANVAS_H}:d=1[bg]`,
            // safer: use 'subtitles' alias, no quotes around path
            `[bg]subtitles=${safeFilterPath(assPath)}[bgcap]`,
            `[1:v]scale=700:-1[logo]`,
            // corrected overlay vars (no W/H)
            `[bgcap][logo]overlay=x=(main_w-overlay_w)/2:y=120[bgWithLogo]`,
            `[0:v]${videoScale},setpts=PTS/1.05[spedupv]`,
            `[bgWithLogo][spedupv]overlay=${vidX}:${vidY}[final]`,
          ])
          .outputOptions(["-map", "[final]", "-map", "0:a?"]);
      } else if (preset === "raw") {
        command = command
          .videoFilters([
            `${videoScale},pad=${CANVAS_W}:${CANVAS_H}:(ow-iw)/2:(oh-ih)/2:color=white,setpts=PTS/1.05`,
          ])
          .outputOptions(["-map", "0:v", "-map", "0:a?"]);
      } else if (preset === "caption_top") {
        command = command
          .complexFilter([
            `color=white:s=${CANVAS_W}x${CANVAS_H}:d=1[bg]`,
            `[bg]subtitles=${safeFilterPath(assPath)}[bgcap]`,
            `[0:v]${videoScale},setpts=PTS/1.05[vid]`,
            `[bgcap][vid]overlay=${vidX}:${vidY}[final]`,
          ])
          .outputOptions(["-map", "[final]", "-map", "0:a?"]);
      } else {
        return reject(new Error(`Unknown preset: ${preset}`));
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
        .duration(89)
        .on("stderr", (line) => {
          if (/error/i.test(line)) console.error("[ffmpeg]", line);
        })
        .on("end", () => {
          try {
            if (assPath) fs.unlinkSync(assPath);
          } catch {}
          resolve(outputPath);
        })
        .on("error", (err) => {
          try {
            if (assPath) fs.unlinkSync(assPath);
          } catch {}
          reject(new Error(`Error transcoding video: ${err.message}`));
        })
        .save(outputPath);
    } catch (e) {
      try {
        if (assPath) fs.unlinkSync(assPath);
      } catch {}
      reject(e);
    }
  });
}

module.exports = { transcodeVideo };
