import { Timeline, MediaAsset } from '@/types/timeline';
import { getDuckGainAtTime, extractSpeechIntervals } from './audioEngine';

export interface RenderProgress {
  percentage: number;
  currentSecond: number;
  totalSeconds: number;
  statusText: string;
}

export interface ExportOptions {
  timeline: Timeline;
  assets: MediaAsset[];
  resolution?: '1080x1920' | '720x1280';
  fps?: number;
  onProgress?: (progress: RenderProgress) => void;
}

/**
 * Client-side 9:16 vertical video renderer using HTML5 Canvas, Web Audio API,
 * and MediaRecorder. Produces a high-quality MP4/WebM video with ducked audio and baked-in captions.
 */
export async function renderAndExportVideo(options: ExportOptions): Promise<Blob> {
  const { timeline, assets, resolution = '1080x1920', fps = 30, onProgress } = options;

  const totalDuration = timeline.totalDuration || 60;
  const speechIntervals = extractSpeechIntervals(timeline.subtitles);

  let width = 1080;
  let height = 1920;
  if (timeline.aspectRatio === '16:9') {
    width = 1920;
    height = 1080;
  } else if (timeline.aspectRatio === '1:1') {
    width = 1080;
    height = 1080;
  }

  // 1. Create off-screen canvas
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) throw new Error('Could not initialize 2D Canvas context for rendering.');

  onProgress?.({
    percentage: 2,
    currentSecond: 0,
    totalSeconds: totalDuration,
    statusText: 'Preloading visual media assets...',
  });

  // 2. Preload asset elements (HTMLVideoElement and HTMLImageElement)
  const assetElements = new Map<string, HTMLImageElement | HTMLVideoElement>();
  for (const asset of assets) {
    if (asset.type === 'image') {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = asset.url;
      await new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.onerror = () => resolve(); // graceful fallback
      });
      assetElements.set(asset.id, img);
    } else if (asset.type === 'video') {
      const vid = document.createElement('video');
      vid.crossOrigin = 'anonymous';
      vid.muted = true;
      vid.playsInline = true;
      vid.src = asset.url;
      await new Promise<void>((resolve) => {
        vid.onloadedmetadata = () => resolve();
        vid.onerror = () => resolve();
        setTimeout(resolve, 2000); // safety timeout
      });
      assetElements.set(asset.id, vid);

      if (asset.thumbnailUrl) {
        const thumbImg = new Image();
        thumbImg.crossOrigin = 'anonymous';
        thumbImg.src = asset.thumbnailUrl;
        thumbImg.onload = () => {};
        assetElements.set(`${asset.id}_thumb`, thumbImg);
      }
    }
  }

  // 3. Setup Web Audio API stream
  const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const audioCtx = new AudioCtx();
  const destNode = audioCtx.createMediaStreamDestination();

  // Setup VO and BG Music audio elements if available
  const voAsset = assets.find((a) => a.id === 'VO_TRACK' || a.type === 'voiceover');
  const bgmAsset = assets.find((a) => a.id === 'BG_MUSIC' || a.type === 'music');

  let voAudio: HTMLAudioElement | null = null;
  let bgmAudio: HTMLAudioElement | null = null;
  let bgmGainNode: GainNode | null = null;

  try {
    if (voAsset?.url) {
      voAudio = new Audio(voAsset.url);
      voAudio.crossOrigin = 'anonymous';
      const voSource = audioCtx.createMediaElementSource(voAudio);
      const voGain = audioCtx.createGain();
      voGain.gain.value = timeline.voiceover?.volume ?? 1.0;
      voSource.connect(voGain);
      voGain.connect(destNode);
    }

    if (bgmAsset?.url) {
      bgmAudio = new Audio(bgmAsset.url);
      bgmAudio.crossOrigin = 'anonymous';
      bgmAudio.loop = true;
      const bgmSource = audioCtx.createMediaElementSource(bgmAudio);
      bgmGainNode = audioCtx.createGain();
      bgmGainNode.gain.value = timeline.backgroundMusic?.volume ?? 0.35;
      bgmSource.connect(bgmGainNode);
      bgmGainNode.connect(destNode);
    }
  } catch (err) {
    console.warn('Web Audio capture notice (will render visual stream):', err);
  }

  // 4. Setup MediaRecorder with canvas stream + audio tracks
  const canvasStream = canvas.captureStream(fps);
  const combinedStream = new MediaStream();
  canvasStream.getVideoTracks().forEach((track) => combinedStream.addTrack(track));
  destNode.stream.getAudioTracks().forEach((track) => combinedStream.addTrack(track));

  // Choose supported MIME type
  let mimeType = 'video/mp4;codecs=avc1';
  if (!MediaRecorder.isTypeSupported(mimeType)) {
    mimeType = 'video/mp4';
  }
  if (!MediaRecorder.isTypeSupported(mimeType)) {
    mimeType = 'video/webm;codecs=vp9,opus';
  }
  if (!MediaRecorder.isTypeSupported(mimeType)) {
    mimeType = 'video/webm';
  }

  const chunks: Blob[] = [];
  const recorder = new MediaRecorder(combinedStream, {
    mimeType,
    videoBitsPerSecond: resolution === '1080x1920' ? 8_000_000 : 4_000_000,
  });

  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) chunks.push(e.data);
  };

  recorder.start(100);

  // Start audio playback synchronized
  if (voAudio) voAudio.play().catch(() => {});
  if (bgmAudio) bgmAudio.play().catch(() => {});

  // 5. Render loop frame by frame
  const totalFrames = Math.floor(totalDuration * fps);
  const frameIntervalMs = 1000 / fps;

  return new Promise<Blob>((resolve, reject) => {
    let currentFrame = 0;

    const renderStep = () => {
      if (currentFrame >= totalFrames) {
        recorder.onstop = () => {
          if (voAudio) voAudio.pause();
          if (bgmAudio) bgmAudio.pause();
          audioCtx.close().catch(() => {});
          const finalBlob = new Blob(chunks, { type: mimeType });
          resolve(finalBlob);
        };
        recorder.stop();
        return;
      }

      const currentTime = currentFrame / fps;

      // Update audio ducking volume dynamically
      if (bgmGainNode) {
        const { currentGain } = getDuckGainAtTime(
          currentTime,
          speechIntervals,
          timeline.backgroundMusic?.volume ?? 0.35,
          timeline.backgroundMusic?.duckingAttenuationDb ?? -16
        );
        bgmGainNode.gain.setValueAtTime(currentGain, audioCtx.currentTime);
      }

      // Draw visual frame onto canvas
      drawTimelineFrame(ctx, width, height, currentTime, timeline, assetElements);

      currentFrame++;

      // Progress reporting
      if (currentFrame % 15 === 0 || currentFrame === totalFrames) {
        const pct = Math.min(99, Math.round((currentFrame / totalFrames) * 100));
        onProgress?.({
          percentage: pct,
          currentSecond: Number(currentTime.toFixed(1)),
          totalSeconds: totalDuration,
          statusText: `Encoding frame ${currentFrame}/${totalFrames} (${currentTime.toFixed(1)}s / ${totalDuration}s)...`,
        });
      }

      // Keep rendering in step with frame rate
      setTimeout(renderStep, Math.max(1, frameIntervalMs / 2));
    };

    renderStep();
  });
}

/**
 * Draws a single timeline frame at time t onto the given 2D context
 */
export function drawTimelineFrame(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  t: number,
  timeline: Timeline,
  assetElements: Map<string, HTMLImageElement | HTMLVideoElement>
) {
  // Clear canvas background
  ctx.fillStyle = '#0a0a0c';
  ctx.fillRect(0, 0, width, height);

  // Find active clip
  const clip = timeline.clips.find(
    (c) => t >= c.startTime && t < c.startTime + c.duration
  ) || timeline.clips[timeline.clips.length - 1];

  if (!clip) return;

  const clipProgress = (t - clip.startTime) / clip.duration; // 0.0 to 1.0
  const el = assetElements.get(clip.assetId);

  ctx.save();

  // Apply Color Filter
  applyColorFilterToCtx(ctx, clip.colorFilter);

  // Apply Motion Effects (Ken Burns, Pan, Shake, Pulse)
  applyMotionTransform(ctx, width, height, clip.motionEffect, clipProgress);

  // Apply Transition effects near in-point
  const transitionTime = t - clip.startTime;
  const transDur = clip.transitionDuration || 0.4;
  if (transitionTime < transDur && clip.transition !== 'none') {
    applyTransitionTransform(ctx, width, height, clip.transition, transitionTime / transDur);
  }

  // Draw Asset Content
  const thumbEl = assetElements.get(`${clip.assetId}_thumb`);
  if (el instanceof HTMLImageElement && el.complete && el.naturalWidth > 0) {
    drawCoverImage(ctx, el, width, height);
  } else if (el instanceof HTMLVideoElement && el.readyState >= 2) {
    // Seek video to corresponding position
    const targetVideoTime = clip.sourceStart + (t - clip.startTime);
    if (Math.abs(el.currentTime - targetVideoTime) > 0.3) {
      el.currentTime = targetVideoTime;
    }
    drawCoverVideo(ctx, el, width, height);
  } else if (thumbEl instanceof HTMLImageElement && thumbEl.complete && thumbEl.naturalWidth > 0) {
    drawCoverImage(ctx, thumbEl, width, height);
  } else {
    // High-tech cyber animated visual fallback
    drawCyberStudioCard(ctx, width, height, clip, t);
  }

  ctx.restore();

  // Render Subtitles (Baked-in Alex Hormozi style)
  drawSubtitlesOnCanvas(ctx, width, height, t, timeline.subtitles);
}

function applyColorFilterToCtx(ctx: CanvasRenderingContext2D, filter: string) {
  switch (filter) {
    case 'cyber':
      ctx.filter = 'contrast(125%) saturate(145%) hue-rotate(190deg) brightness(105%)';
      break;
    case 'warm-vintage':
      ctx.filter = 'sepia(35%) contrast(110%) brightness(95%) saturate(115%)';
      break;
    case 'noir':
      ctx.filter = 'grayscale(100%) contrast(140%) brightness(90%)';
      break;
    case 'high-contrast':
      ctx.filter = 'contrast(135%) saturate(130%) brightness(102%)';
      break;
    case 'teal-orange':
      ctx.filter = 'contrast(120%) saturate(135%) hue-rotate(15deg)';
      break;
    case 'cinematic':
      ctx.filter = 'contrast(115%) brightness(98%) saturate(110%)';
      break;
    default:
      ctx.filter = 'none';
      break;
  }
}

function applyMotionTransform(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  motion: string,
  progress: number
) {
  const cx = width / 2;
  const cy = height / 2;
  ctx.translate(cx, cy);

  switch (motion) {
    case 'ken-burns-zoom-in': {
      const scale = 1.0 + progress * 0.15; // 1.00 -> 1.15
      ctx.scale(scale, scale);
      break;
    }
    case 'ken-burns-zoom-out': {
      const scale = 1.15 - progress * 0.15; // 1.15 -> 1.00
      ctx.scale(scale, scale);
      break;
    }
    case 'pan-left': {
      const shiftX = (0.5 - progress) * (width * 0.08);
      ctx.translate(shiftX, 0);
      ctx.scale(1.08, 1.08);
      break;
    }
    case 'pan-right': {
      const shiftX = (progress - 0.5) * (width * 0.08);
      ctx.translate(shiftX, 0);
      ctx.scale(1.08, 1.08);
      break;
    }
    case 'pulse': {
      const scale = 1.0 + Math.sin(progress * Math.PI * 2) * 0.05;
      ctx.scale(scale, scale);
      break;
    }
    case 'shake': {
      const shakeX = Math.sin(progress * 40) * 8;
      ctx.translate(shakeX, 0);
      break;
    }
  }

  ctx.translate(-cx, -cy);
}

function applyTransitionTransform(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  transition: string,
  transProgress: number // 0 (start of transition) to 1 (done)
) {
  const t = 1 - transProgress; // 1 -> 0
  switch (transition) {
    case 'cross-dissolve':
      ctx.globalAlpha = transProgress;
      break;
    case 'whip-pan': {
      const shiftX = t * width * 0.8;
      ctx.translate(shiftX, 0);
      ctx.globalAlpha = 0.5 + transProgress * 0.5;
      break;
    }
    case 'zoom-snap': {
      const scale = 1.0 + t * 0.35;
      const cx = width / 2;
      const cy = height / 2;
      ctx.translate(cx, cy);
      ctx.scale(scale, scale);
      ctx.translate(-cx, -cy);
      break;
    }
    case 'glitch': {
      const jitterX = (Math.random() - 0.5) * 30 * t;
      const jitterY = (Math.random() - 0.5) * 15 * t;
      ctx.translate(jitterX, jitterY);
      break;
    }
    case 'slide-left': {
      ctx.translate(-t * width * 0.5, 0);
      break;
    }
  }
}

function drawCoverImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  canvasW: number,
  canvasH: number
) {
  const imgRatio = img.naturalWidth / img.naturalHeight;
  const canvasRatio = canvasW / canvasH;
  let renderW: number;
  let renderH: number;
  let offsetX: number;
  let offsetY: number;

  if (imgRatio > canvasRatio) {
    renderH = canvasH;
    renderW = canvasH * imgRatio;
    offsetX = (canvasW - renderW) / 2;
    offsetY = 0;
  } else {
    renderW = canvasW;
    renderH = canvasW / imgRatio;
    offsetX = 0;
    offsetY = (canvasH - renderH) / 2;
  }

  ctx.drawImage(img, offsetX, offsetY, renderW, renderH);
}

function drawCoverVideo(
  ctx: CanvasRenderingContext2D,
  vid: HTMLVideoElement,
  canvasW: number,
  canvasH: number
) {
  const vidW = vid.videoWidth || 1080;
  const vidH = vid.videoHeight || 1920;
  const vidRatio = vidW / vidH;
  const canvasRatio = canvasW / canvasH;
  let renderW: number;
  let renderH: number;
  let offsetX: number;
  let offsetY: number;

  if (vidRatio > canvasRatio) {
    renderH = canvasH;
    renderW = canvasH * vidRatio;
    offsetX = (canvasW - renderW) / 2;
    offsetY = 0;
  } else {
    renderW = canvasW;
    renderH = canvasW / vidRatio;
    offsetX = 0;
    offsetY = (canvasH - renderH) / 2;
  }

  try {
    ctx.drawImage(vid, offsetX, offsetY, renderW, renderH);
  } catch {
    // Video frame not ready yet
  }
}

/**
 * Renders short-form punchy dynamic captions (Alex Hormozi / MrBeast viral style)
 * with animated active-word highlighting directly onto the canvas frame.
 */
function drawSubtitlesOnCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  t: number,
  subtitles: Timeline['subtitles']
) {
  if (!subtitles || subtitles.length === 0) return;

  const currentSegment = subtitles.find(
    (sub) => t >= sub.startTime && t <= sub.endTime
  );

  if (!currentSegment) return;

  ctx.save();

  // Position captions based on relative percentages
  const relX = (currentSegment.position?.x ?? 50) / 100;
  const relY = (currentSegment.position?.y ?? 72) / 100;
  const posY = height * relY;

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const fontSize = Math.round(width * 0.052);
  ctx.font = `900 ${fontSize}px "Impact", "Arial Black", sans-serif`;

  // Calculate word widths for centered inline layout
  const words = currentSegment.words;
  const spaceWidth = ctx.measureText(' ').width;
  const wordMetrics = words.map((w) => ({
    ...w,
    width: ctx.measureText(w.word.toUpperCase()).width,
    isActive: t >= w.start && t <= w.end,
  }));

  const totalTextWidth =
    wordMetrics.reduce((sum, w) => sum + w.width, 0) + (words.length - 1) * spaceWidth;

  let startX = (width * relX) - (totalTextWidth / 2);

  // Background subtle pill backdrop
  const pillPaddingX = 26;
  const pillPaddingY = 16;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.beginPath();
  ctx.roundRect(
    startX - pillPaddingX,
    posY - fontSize / 2 - pillPaddingY,
    totalTextWidth + pillPaddingX * 2,
    fontSize + pillPaddingY * 2,
    20
  );
  ctx.fill();

  // Render each word
  for (const item of wordMetrics) {
    const wordX = startX + item.width / 2;

    ctx.save();
    if (item.isActive) {
      // Pop / scale active word
      ctx.translate(wordX, posY);
      ctx.scale(1.15, 1.15);
      ctx.translate(-wordX, -posY);

      ctx.lineWidth = 10;
      ctx.strokeStyle = '#000000';
      ctx.strokeText(item.word.toUpperCase(), wordX, posY);

      ctx.fillStyle = item.color || '#facc15';
      ctx.fillText(item.word.toUpperCase(), wordX, posY);
    } else {
      ctx.lineWidth = 8;
      ctx.strokeStyle = '#000000';
      ctx.strokeText(item.word.toUpperCase(), wordX, posY);

      ctx.fillStyle = item.color || '#ffffff';
      ctx.fillText(item.word.toUpperCase(), wordX, posY);
    }
    ctx.restore();

    startX += item.width + spaceWidth;
  }

  ctx.restore();
}

/**
 * Draws an aesthetic high-tech cyber studio card as visual fallback
 */
function drawCyberStudioCard(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  clip: { assetId: string; motionEffect: string },
  t: number
) {
  // Deep gradient background
  const grad = ctx.createRadialGradient(width / 2, height / 2, 50, width / 2, height / 2, height * 0.7);
  grad.addColorStop(0, '#1e1b4b'); // deep indigo
  grad.addColorStop(0.5, '#0f172a'); // slate 900
  grad.addColorStop(1, '#020617'); // slate 950
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  // Animated subtle grid lines
  ctx.strokeStyle = 'rgba(99, 102, 241, 0.12)';
  ctx.lineWidth = 2;
  const gridSize = 80;
  const offset = (t * 20) % gridSize;

  for (let x = -gridSize; x < width + gridSize; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x + offset, 0);
    ctx.lineTo(x + offset, height);
    ctx.stroke();
  }

  for (let y = -gridSize; y < height + gridSize; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y + offset);
    ctx.lineTo(width, y + offset);
    ctx.stroke();
  }

  // Glowing center badge
  const cx = width / 2;
  const cy = height * 0.45;
  const badgeW = width * 0.7;
  const badgeH = 180;

  ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
  ctx.strokeStyle = 'rgba(129, 140, 248, 0.4)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(cx - badgeW / 2, cy - badgeH / 2, badgeW, badgeH, 24);
  ctx.fill();
  ctx.stroke();

  // Badge Text
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.fillStyle = '#818cf8';
  ctx.font = 'bold 36px monospace';
  ctx.fillText('AUTOCUT STUDIO', cx, cy - 35);

  ctx.fillStyle = '#ffffff';
  ctx.font = '900 52px sans-serif';
  ctx.fillText(`[ ${clip.assetId} ]`, cx, cy + 25);
}

