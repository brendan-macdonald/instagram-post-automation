/**
 * transcodeVideo.js
 * High-level transcoding pipeline for 1080x1920 vertical reels: builds a white canvas,
 * scales/positions the source video, and supports presets for captions or logo overlay.
 *
 * Exports:
 *   - transcodeVideo: Transcodes a source video into a 9:16 output with optional logo/caption styling.
 *
 * Usage:
 *   const { transcodeVideo } = require("./transcodeVideo");
 *   await transcodeVideo("input.mp4", "output.mp4", "./logo.png", true, {
 *     preset: "caption_top",
 *     source_caption: "Your caption here"
 *   });
 */

// transcodeVideo.js
const fs = require("fs");
const os = require("os");
const path = require("path");
const ffmpeg = require("fluent-ffmpeg");

// Use node-bundled binaries (matches your old setup)
const ffmpegPath = require("ffmpeg-static");
const ffprobePath = require("@ffprobe-installer/ffprobe").path;

ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);

const CANVAS_W = 1080;
const CANVAS_H = 1920;

// -------- caption helpers --------

/**
 * Resolve the caption text based on strategy.
 *
 * @param {Object} params
 * @param {"custom"|"from_source"|"default"} params.caption_strategy - How to determine caption.
 * @param {string} params.caption_custom - Custom caption text when strategy is "custom".
 * @param {string} params.source_caption - Caption derived from the source media.
 * @param {string} params.default_caption - Fallback caption if others are empty.
 * @returns {string} Final caption string (may be empty).
 */
function resolveCaption({
  caption_strategy,
  caption_custom,
  source_caption,
  default_caption,
}) {
  const fallback = (default_caption || "").trim();
  if (caption_strategy === "custom")
    return (caption_custom || "").trim() || fallback;
  if (caption_strategy === "from_source")
    return (source_caption || "").trim() || fallback;
  return fallback;
}

/**
 * Probe video dimensions using ffprobe.
 *
 * @param {string} inputPath - Path to input media.
 * @returns {Promise<{width:number,height:number}>} Width/height or zeros if unavailable.
 */
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

/**
 * Detect whether source is approximately 9:16.
 *
 * @param {string} inputPath - Path to input media.
 * @returns {Promise<{is916:boolean}>} True when aspect is ~0.5625 within tolerance.
 */
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
 * Compute scaled video placement within a 1080x1920 canvas.
 * - If ~9:16: pin under the top strip.
 * - Otherwise: place slightly higher than center (1/3 offset).
 *
 * @param {number} srcW - Source width.
 * @param {number} srcH - Source height.
 * @param {boolean} is916 - Whether source is ~9:16.
 * @param {number} topStrip - Pixels reserved at top (e.g., for captions).
 * @returns {{outVideoW:number,outVideoH:number,x:number,y:number}} Layout metrics.
 */
function computeScaledLayout(srcW, srcH, is916, topStrip) {
  const availW = CANVAS_W;
  const availH = CANVAS_H - topStrip;

  const scale = Math.min(availW / srcW, availH / srcH);
  const outVideoW = Math.round(srcW * scale);
  const outVideoH = Math.round(srcH * scale);

  const x = Math.round((CANVAS_W - outVideoW) / 2);
  const y = is916 ? topStrip : topStrip + Math.round((availH - outVideoH) / 3);

  return { outVideoW, outVideoH, x, y };
}

/**
 * Make a filter-safe file path for ffmpeg expressions.
 *
 * @param {string} p - Original path.
 * @returns {string} Sanitized/escaped path.
 */
function safeFilterPath(p) {
  return p.replace(/\\/g, "/").replace(/'/g, "\\'");
}

/**
 * Build a temporary .ass subtitle file for top captions.
 *
 * @param {Object} params
 * @param {string} params.text - Caption text (supports newlines).
 * @param {string} [params.fontFamily="DejaVu Sans"] - Font family.
 * @param {number} [params.fontSize=48] - Font size.
 * @param {number} params.bottomOfCaptionY - Y pixel where caption block should end.
 * @param {number} params.videoLeftRightMargin - Horizontal margins to avoid overlapping video.
 * @returns {string} Path to the generated .ass file.
 */
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

// -------- main --------

/**
 * Transcode a source video into a 1080x1920 reel with optional logo or top caption preset.
 *
 * Presets:
 *   - "raw":         Scales video onto a white canvas with slight 1.05x speed-up.
 *   - "caption_top": Renders an ASS caption at the top, places video below it.
 *   - "logo_only":   Overlays a centered logo near the top, positions video slightly lower.
 *
 * Common encoding:
 *   - H.264 (libx264, high@4.0), yuv420p, AAC 128k, 44.1kHz stereo
 *   - GOP 48, faststart, ~2 Mbps target
 *   - Audio atempo 1.05, video setpts 1.05x (where applicable)
 *
 * @param {string} inputPath - Source video path.
 * @param {string} outputPath - Destination path for the transcoded video.
 * @param {string|null} [logoPath=null] - Path to logo image when using "logo_only".
 * @param {boolean} [withLogo=true] - Whether to attempt logo overlay for logo-based presets.
 * @param {Object} [options={}] - Additional options and preset parameters.
 * @param {"raw"|"caption_top"|"logo_only"} [options.preset] - Preset selection; defaults based on logo presence.
 * @param {"default"|"custom"|"from_source"} [options.caption_strategy="default"] - How to compute caption text.
 * @param {string} [options.caption_custom=""] - Custom caption when strategy is "custom".
 * @param {string} [options.source_caption=""] - Caption from the source when strategy is "from_source".
 * @param {string} [options.default_caption] - Fallback caption.
 * @param {string} [options.fontFamily="DejaVu Sans"] - Caption font family.
 * @param {number} [options.fontSize=48] - Caption font size.
 * @param {number} [options.topStrip=240] - Reserved pixels at the top for caption area.
 * @param {number} [options.captionBottomMargin=12] - Space between caption block and video.
 * @returns {Promise<string>} Resolves with the outputPath when transcoding completes.
 * @throws {Error} On invalid preset or ffmpeg processing errors.
 */
function transcodeVideo(
  inputPath,
  outputPath,
  logoPath = null,
  withLogo = true,
  options = {}
) {
  const {
    preset: presetIn = withLogo && logoPath ? "logo_only" : "raw",
    caption_strategy = "default",
    caption_custom = "",
    source_caption = "",
    fontFamily = "DejaVu Sans",
    fontSize = 48,
    topStrip = 240,
    captionBottomMargin = 12,
  } = options;

  const preset = String(presetIn).trim().toLowerCase();

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

      const videoScale = `scale=${outVideoW}:${outVideoH}:force_original_aspect_ratio=decrease`;

      const ensureAss = () => {
        if (assPath) return assPath;
        const videoLRMargin = (CANVAS_W - outVideoW) / 2;
        const bottomOfCaptionY = vidY - captionBottomMargin;
        assPath = buildAssCaptionFile({
          text: chosenCaption,
          fontFamily,
          fontSize,
          bottomOfCaptionY,
          videoLeftRightMargin: videoLRMargin,
        });
        return assPath;
      };

      if (preset === "raw") {
        command = command
          .videoFilters([
            `${videoScale},pad=${CANVAS_W}:${CANVAS_H}:(ow-iw)/2:(oh-ih)/2:color=white,setpts=PTS/1.05`,
          ])
          .outputOptions(["-map", "0:v", "-map", "0:a?"]);
      } else if (preset === "caption_top") {
        const cap = ensureAss();
        command = command
          .complexFilter([
            `color=white:s=${CANVAS_W}x${CANVAS_H}:d=1[bg]`,
            `[bg]subtitles=${safeFilterPath(cap)}[bgcap]`,
            `[0:v]${videoScale},setpts=PTS/1.05[vid]`,
            `[bgcap][vid]overlay=${vidX}:${vidY}[final]`,
          ])
          .outputOptions(["-map", "[final]", "-map", "0:a?"]);
      } else if (preset === "logo_only") {
        // === Legacy pipeline restored ===
        const hasLogo = withLogo && logoPath && fs.existsSync(logoPath);
        if (!hasLogo) {
          return reject(
            new Error("Preset 'logo_only' requires a valid logoPath.")
          );
        }

        command = command
          .input(logoPath)
          .complexFilter([
            // 1) White background 1080x1920
            `color=white:s=${CANVAS_W}x${CANVAS_H}:d=1[bg]`,

            // 2) Scale logo to width 700
            `[1:v]scale=700:-1[logo]`,

            // 3) Overlay logo centered at y=120
            `[bg][logo]overlay=x=(main_w-overlay_w)/2:y=120[bgWithLogo]`,

            // 4) Scale video to width 820 (height auto)
            `[0:v]scale=820:-2[resized]`,

            // 5) Speed up video (choose one; legacy ended up 1.05x)
            `[resized]setpts=PTS/1.05[spedupv]`,

            // 6) Overlay video centered with +80px vertical shift
            `[bgWithLogo][spedupv]overlay=(main_w-overlay_w)/2:(main_h-overlay_h)/2+80[final]`,
          ])
          .outputOptions(["-map", "[final]", "-map", "0:a?"]);
      } else {
        return reject(
          new Error(
            `Unknown preset: ${preset}. Allowed: raw, caption_top, logo_only`
          )
        );
      }

      // Shared encoding settings
      command
        .audioFilters("atempo=1.05") // set to 1.1 if you switch setpts to 1.1
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
