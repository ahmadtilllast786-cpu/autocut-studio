'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Timeline, MediaAsset, SubtitleStyleType, AspectRatioType, CaptionPosition } from '@/types/timeline';
import { DynamicSubtitles } from './DynamicSubtitles';
import { DraggableCaptionOverlay } from '@/components/captions/DraggableCaptionOverlay';
import { extractSpeechIntervals, getDuckGainAtTime, SyntheticAudioProvider } from '@/lib/audioEngine';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  FastForward,
  Rewind,
  Eye,
  EyeOff,
  Sparkles,
  Smartphone,
  Tv,
  Square,
  Move,
} from 'lucide-react';

interface RemotionPreviewPlayerProps {
  timeline: Timeline;
  assets: MediaAsset[];
  currentTime: number;
  onTimeUpdate: React.Dispatch<React.SetStateAction<number>>;
  onAspectRatioChange?: (ratio: AspectRatioType) => void;
  onCaptionPositionChange?: (pos: CaptionPosition) => void;
  onSubtitleStyleChange?: (style: SubtitleStyleType) => void;
}

export function RemotionPreviewPlayer({
  timeline,
  assets,
  currentTime,
  onTimeUpdate,
  onAspectRatioChange,
  onCaptionPositionChange,
  onSubtitleStyleChange,
}: RemotionPreviewPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<1 | 1.5 | 2>(1);
  const [showSafeZone, setShowSafeZone] = useState(false);
  const [isCurrentlyDucking, setIsCurrentlyDucking] = useState(false);
  const [videoErrorMap, setVideoErrorMap] = useState<Record<string, boolean>>({});
  const [viewportDims, setViewportDims] = useState<{ width: number; height: number }>({
    width: 340,
    height: 604,
  });

  const viewportRef = useRef<HTMLDivElement>(null);
  const videoElementRef = useRef<HTMLVideoElement>(null);
  const voAudioRef = useRef<HTMLAudioElement>(null);
  const bgmAudioRef = useRef<HTMLAudioElement>(null);
  const requestAnimRef = useRef<number | null>(null);
  const lastTimestampRef = useRef<number | null>(null);

  const totalDuration = timeline.totalDuration || 60;
  const speechIntervals = extractSpeechIntervals(timeline.subtitles);
  const activeStyle = timeline.activeSubtitleStyle || 'bouncy-karaoke';
  const captionPos = timeline.captionPosition || { x: 50, y: 70 };
  const currentRatio = timeline.aspectRatio || '9:16';

  // Measure viewport dimensions dynamically for drag coordinates
  useEffect(() => {
    if (!viewportRef.current) return;
    const updateSize = () => {
      if (viewportRef.current) {
        setViewportDims({
          width: viewportRef.current.clientWidth,
          height: viewportRef.current.clientHeight,
        });
      }
    };
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(viewportRef.current);
    return () => observer.disconnect();
  }, [currentRatio]);

  // Find active main clip at currentTime (videos/photos on the main sequence line)
  const activeClip =
    timeline.clips.find(
      (c) => (!c.trackId || c.trackId === 'main') && currentTime >= c.startTime && currentTime < c.startTime + c.duration
    ) ||
    timeline.clips.find((c) => !c.trackId || c.trackId === 'main') ||
    timeline.clips[timeline.clips.length - 1];

  // Active overlay / B-roll clips (placed in lines above the main timeline)
  const activeOverlayClips = timeline.clips.filter(
    (c) => c.trackId?.startsWith('overlay') && currentTime >= c.startTime && currentTime < c.startTime + c.duration
  );

  const activeAsset = activeClip ? assets.find((a) => a.id === activeClip.assetId) : null;
  const isVideo = activeAsset?.type === 'video';

  const voAsset = assets.find((a) => a.id === 'VO_TRACK' || a.type === 'voiceover');
  const bgmAsset = assets.find((a) => a.id === 'BG_MUSIC' || a.type === 'music');

  const formatTimecode = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    const ms = Math.floor((sec % 1) * 10);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${ms}`;
  };

  // Playhead animation loop
  const stepAnimation = useCallback((timestamp: number) => {
    if (!lastTimestampRef.current) lastTimestampRef.current = timestamp;
    const delta = (timestamp - lastTimestampRef.current) / 1000;
    lastTimestampRef.current = timestamp;

    onTimeUpdate((prev) => {
      const nextTime = prev + delta * playbackSpeed;
      if (nextTime >= totalDuration) {
        setIsPlaying(false);
        return 0;
      }
      return nextTime;
    });

    requestAnimRef.current = requestAnimationFrame(stepAnimation);
  }, [playbackSpeed, totalDuration, onTimeUpdate]);

  useEffect(() => {
    if (isPlaying) {
      lastTimestampRef.current = performance.now();
      requestAnimRef.current = requestAnimationFrame(stepAnimation);

      if (voAudioRef.current && !isMuted) {
        voAudioRef.current.currentTime = currentTime;
        voAudioRef.current.play().catch(() => {});
      }
      if (bgmAudioRef.current && !isMuted) {
        bgmAudioRef.current.currentTime = currentTime % (bgmAudioRef.current.duration || 60);
        bgmAudioRef.current.play().catch(() => {});
      }
    } else {
      if (requestAnimRef.current) cancelAnimationFrame(requestAnimRef.current);
      lastTimestampRef.current = null;
      if (voAudioRef.current) voAudioRef.current.pause();
      if (bgmAudioRef.current) bgmAudioRef.current.pause();
      if (videoElementRef.current) videoElementRef.current.pause();
    }

    return () => {
      if (requestAnimRef.current) cancelAnimationFrame(requestAnimRef.current);
    };
  }, [isPlaying, isMuted, stepAnimation]);

  // Audio ducking volume update in real time
  useEffect(() => {
    const { currentGain, isDucking } = getDuckGainAtTime(
      currentTime,
      speechIntervals,
      timeline.backgroundMusic?.volume ?? 0.35,
      timeline.backgroundMusic?.duckingAttenuationDb ?? -16
    );

    setIsCurrentlyDucking(isDucking);

    if (bgmAudioRef.current && !isMuted) {
      bgmAudioRef.current.volume = Math.max(0, Math.min(1, currentGain));
    }
  }, [currentTime, speechIntervals, isMuted, timeline.backgroundMusic]);

  // Synchronize active video element with timeline timecode
  useEffect(() => {
    if (isVideo && videoElementRef.current && activeClip) {
      const targetTime = activeClip.sourceStart + (currentTime - activeClip.startTime);
      if (Math.abs(videoElementRef.current.currentTime - targetTime) > 0.4) {
        videoElementRef.current.currentTime = targetTime;
      }
      if (isPlaying && videoElementRef.current.paused) {
        videoElementRef.current.play().catch(() => {});
      }
    }
  }, [currentTime, isVideo, activeClip, isPlaying]);

  const togglePlay = () => {
    SyntheticAudioProvider.getAudioContext();
    setIsPlaying(!isPlaying);
  };

  const handleSeekDelta = (delta: number) => {
    const newTime = Math.max(0, Math.min(totalDuration, currentTime + delta));
    onTimeUpdate(newTime);
  };

  const clipProgress = activeClip
    ? Math.max(0, Math.min(1, (currentTime - activeClip.startTime) / activeClip.duration))
    : 0;

  const getMotionTransform = () => {
    if (!activeClip) return '';
    const motion = activeClip.motionEffect;
    switch (motion) {
      case 'punch_in': {
        // High impact punch: rapid zoom pop settling into punchy scale
        const punch = clipProgress < 0.25 ? 1.18 - clipProgress * 0.15 : 1.14 + clipProgress * 0.03;
        return `scale(${punch.toFixed(3)})`;
      }
      case 'whip_pan': {
        // Lateral whip pan offset decaying rapidly into centered stability
        const panOffset = (1 - Math.min(1, clipProgress * 2.8)) * 36;
        return `translateX(${panOffset.toFixed(1)}px) scale(1.06)`;
      }
      case 'ken_burns_zoom': {
        // Continuous smooth zoom-in for high retention
        return `scale(${(1.0 + clipProgress * 0.15).toFixed(3)})`;
      }
      case 'white_flash': {
        // Subtle drift while flash occurs
        return `scale(${(1.0 + clipProgress * 0.05).toFixed(3)})`;
      }
      // Backwards-compatible legacy fallbacks
      case 'ken-burns-zoom-in' as string:
        return `scale(${1.0 + clipProgress * 0.18})`;
      case 'ken-burns-zoom-out' as string:
        return `scale(${1.18 - clipProgress * 0.18})`;
      case 'pan-left' as string:
        return `translateX(${(0.5 - clipProgress) * 35}px) scale(1.1)`;
      case 'pan-right' as string:
        return `translateX(${(clipProgress - 0.5) * 35}px) scale(1.1)`;
      default:
        return 'scale(1.0)';
    }
  };

  const getColorFilterClass = () => {
    if (!activeClip) return '';
    switch (activeClip.colorFilter) {
      case 'cyber':
        return 'contrast-125 saturate-150 hue-rotate-[190deg] brightness-105';
      case 'warm-vintage':
        return 'sepia-[0.35] contrast-110 brightness-95 saturate-115';
      case 'noir':
        return 'grayscale contrast-125 brightness-90';
      case 'high-contrast':
        return 'contrast-125 saturate-125';
      case 'teal-orange':
        return 'contrast-115 saturate-125 hue-rotate-[15deg]';
      case 'cinematic':
        return 'contrast-110 saturate-105 brightness-98';
      default:
        return '';
    }
  };

  const transitionProgress = activeClip
    ? Math.max(0, (currentTime - activeClip.startTime) / (activeClip.transitionDuration || 0.4))
    : 1;

  const isTransitioning = transitionProgress < 1 && activeClip?.transition !== 'none';

  // Responsive Viewport sizing strictly hard-locked to Aspect Ratio
  const getViewportAspectClass = () => {
    switch (currentRatio) {
      case '16:9':
        return 'aspect-[16/9] max-h-full max-w-full';
      case '1:1':
        return 'aspect-square max-h-full max-w-full';
      case '9:16':
      default:
        return 'aspect-[9/16] max-h-full max-w-full';
    }
  };

  return (
    <div className="flex flex-col items-center justify-between h-full w-full bg-[#0d0d0e] p-2 gap-2 overflow-hidden select-none">
      {/* Top Bar Controls */}
      <div className="w-full flex items-center justify-between px-1 text-xs gap-2 flex-wrap flex-shrink-0">
        {/* Multi-Aspect Ratio Switcher */}
        <div className="flex items-center gap-1 bg-[#121214] p-0.5 rounded-lg border border-[#27272a]">
          <button
            type="button"
            onClick={() => onAspectRatioChange?.('9:16')}
            className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold transition cursor-pointer ${
              currentRatio === '9:16'
                ? 'bg-[#27272a] text-white border border-zinc-600'
                : 'text-zinc-400 hover:text-white'
            }`}
            title="9:16 Vertical (TikTok, Reels, Shorts)"
          >
            <Smartphone className="w-3 h-3" />
            <span>9:16</span>
          </button>

          <button
            type="button"
            onClick={() => onAspectRatioChange?.('16:9')}
            className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold transition cursor-pointer ${
              currentRatio === '16:9'
                ? 'bg-[#27272a] text-white border border-zinc-600'
                : 'text-zinc-400 hover:text-white'
            }`}
            title="16:9 Landscape (YouTube, Desktop)"
          >
            <Tv className="w-3 h-3" />
            <span>16:9</span>
          </button>

          <button
            type="button"
            onClick={() => onAspectRatioChange?.('1:1')}
            className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold transition cursor-pointer ${
              currentRatio === '1:1'
                ? 'bg-[#27272a] text-white border border-zinc-600'
                : 'text-zinc-400 hover:text-white'
            }`}
            title="1:1 Square (Instagram Post, Square Feed)"
          >
            <Square className="w-3 h-3" />
            <span>1:1</span>
          </button>
        </div>

        {/* Ducking Indicator Badge */}
        {isCurrentlyDucking && (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#18181b] text-zinc-300 text-[10px] font-mono border border-[#27272a]">
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-pulse" />
            Ducking -16dB
          </span>
        )}

        {/* Safe Zone Toggle */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowSafeZone(!showSafeZone)}
            className={`p-1.5 rounded-md border text-[11px] transition cursor-pointer flex items-center gap-1 ${
              showSafeZone
                ? 'bg-[#27272a] border-zinc-600 text-white'
                : 'bg-[#121214] border-[#27272a] text-zinc-400 hover:text-white'
            }`}
            title="Toggle Safe Zone Guidelines"
          >
            {showSafeZone ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">Safe Zone</span>
          </button>
        </div>
      </div>

      {/* ADAPTIVE MULTI-ASPECT RATIO PLAYER VIEWPORT CONTAINER */}
      <div className="flex-1 w-full min-h-0 flex items-center justify-center overflow-hidden p-1">
        <div
          ref={viewportRef}
          className={`relative ${getViewportAspectClass()} bg-[#0d0d0e] rounded-xl overflow-hidden shadow-2xl border border-[#27272a] flex items-center justify-center select-none group/player`}
        >
        {/* Layer 1: Visual Media Content with 9:16 Blur-Padding */}
        <div
          className={`w-full h-full relative overflow-hidden transition-all duration-300 ${getColorFilterClass()}`}
        >
          {/* Background Blurred Backdrop for Blur-Padding Non-Vertical Media */}
          {activeClip?.fitMode !== 'cover' && (
            <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
              {isVideo && activeAsset && !videoErrorMap[activeAsset.id] ? (
                <video
                  src={activeAsset.url}
                  muted
                  playsInline
                  className="w-full h-full object-cover blur-2xl scale-130 opacity-55"
                />
              ) : activeAsset?.thumbnailUrl || activeAsset?.type === 'image' ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={activeAsset.type === 'image' ? activeAsset.url : activeAsset.thumbnailUrl}
                  alt=""
                  className="w-full h-full object-cover blur-2xl scale-130 opacity-55"
                />
              ) : null}
              <div className="absolute inset-0 bg-black/30" />
            </div>
          )}

          {/* Foreground Crisp Media Element with Motion Presets Applied */}
          {isVideo && activeAsset && !videoErrorMap[activeAsset.id] ? (
            <div
              style={{
                transform: getMotionTransform(),
                transition: 'transform 0.08s linear',
              }}
              className="w-full h-full relative z-[1] flex items-center justify-center"
            >
              <video
                ref={videoElementRef}
                src={activeAsset.url}
                muted
                playsInline
                onError={() => {
                  if (activeAsset) {
                    setVideoErrorMap((prev) => ({ ...prev, [activeAsset.id]: true }));
                  }
                }}
                className={`w-full h-full pointer-events-none ${
                  activeClip?.fitMode === 'cover' ? 'object-cover' : 'object-contain'
                }`}
              />
            </div>
          ) : activeAsset?.thumbnailUrl || activeAsset?.type === 'image' ? (
            <div
              style={{
                transform: getMotionTransform(),
                transition: 'transform 0.08s linear',
              }}
              className="w-full h-full relative z-[1] flex items-center justify-center"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={activeAsset.type === 'image' ? activeAsset.url : activeAsset.thumbnailUrl}
                alt={activeAsset.name}
                className={`w-full h-full pointer-events-none ${
                  activeClip?.fitMode === 'cover' ? 'object-cover' : 'object-contain'
                }`}
              />
            </div>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-zinc-950 text-zinc-600">
              <Sparkles className="w-8 h-8 mb-2 text-indigo-400 opacity-40 animate-pulse" />
              <p className="text-xs font-semibold text-zinc-400">Ready to Direct</p>
              <p className="text-[10px] text-zinc-600 mt-1">Upload media or load sample pack</p>
            </div>
          )}

          {/* 4 Viral Motion & Transition Overlays */}
          {activeClip && (
            <>
              {/* White Flash Effect (Spikes to pure white then fades in 0.25s) */}
              {(activeClip.transition === 'white_flash' || activeClip.motionEffect === 'white_flash') &&
                transitionProgress < 1 && (
                  <div
                    className="absolute inset-0 pointer-events-none z-10 bg-white"
                    style={{ opacity: Math.max(0, 1 - transitionProgress * 3.5) }}
                  />
                )}

              {/* Whip Pan Motion Blur Overlay */}
              {activeClip.transition === 'whip_pan' && transitionProgress < 1 && (
                <div
                  className="absolute inset-0 pointer-events-none z-10 backdrop-blur-md bg-black/25"
                  style={{ opacity: Math.max(0, 1 - transitionProgress * 1.8) }}
                />
              )}

              {/* Punch In Vignette Snap */}
              {activeClip.transition === 'punch_in' && transitionProgress < 0.6 && (
                <div
                  className="absolute inset-0 pointer-events-none z-10 bg-black/30"
                  style={{ opacity: Math.max(0, 0.6 - transitionProgress) }}
                />
              )}
            </>
          )}
        </div>

        {/* Layer 1.5: Active B-Roll / Overlay Track Clips (Tracks placed above main timeline) */}
        {activeOverlayClips.map((overlayClip) => {
          const overlayAsset = assets.find((a) => a.id === overlayClip.assetId);
          if (!overlayAsset) return null;
          const isOverlayVid = overlayAsset.type === 'video';
          return (
            <div
              key={overlayClip.id}
              className="absolute inset-x-4 top-12 h-44 rounded-xl overflow-hidden shadow-2xl border-2 border-indigo-500/80 z-[8] bg-black/60 pointer-events-none"
            >
              <div className="absolute top-1.5 left-2 px-1.5 py-0.5 rounded bg-indigo-600/90 text-[9px] font-bold text-white tracking-wider uppercase z-10 flex items-center gap-1 shadow">
                <span>B-ROLL OVERLAY</span>
              </div>
              {isOverlayVid ? (
                <video
                  src={overlayAsset.url}
                  muted
                  playsInline
                  autoPlay
                  loop
                  className="w-full h-full object-cover"
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={overlayAsset.type === 'image' ? overlayAsset.url : overlayAsset.thumbnailUrl}
                  alt={overlayAsset.name}
                  className="w-full h-full object-cover"
                />
              )}
            </div>
          );
        })}

        {/* Layer 2: Interactive Draggable Captions Overlay with Snapping */}
        <DraggableCaptionOverlay
          position={captionPos}
          onPositionChange={(pos) => onCaptionPositionChange?.(pos)}
          containerWidth={viewportDims.width}
          containerHeight={viewportDims.height}
          enabled={true}
        >
          <DynamicSubtitles
            currentTime={currentTime}
            subtitles={timeline.subtitles}
            defaultStyle={activeStyle}
            aspectRatio={currentRatio}
          />
        </DraggableCaptionOverlay>

        {/* Layer 3: TikTok / Reels Safe Zone Overlay */}
        {showSafeZone && (
          <div className="absolute inset-0 pointer-events-none z-20 border-x-4 border-dashed border-red-500/30">
            <div className="absolute top-0 inset-x-0 h-14 bg-red-500/10 border-b border-dashed border-red-500/40 flex items-center justify-center text-[10px] font-mono text-red-400">
              Top Safe Zone (Nav / Live)
            </div>
            <div className="absolute right-0 top-16 bottom-24 w-14 bg-red-500/10 border-l border-dashed border-red-500/40 flex flex-col items-center justify-center text-[9px] font-mono text-red-400 p-1 text-center">
              Actions Area
            </div>
            <div className="absolute bottom-0 inset-x-0 h-20 bg-red-500/10 border-t border-dashed border-red-500/40 flex items-center justify-center text-[10px] font-mono text-red-400">
              Bottom Safe Zone (Title / Audio)
            </div>
          </div>
        )}

        {/* In-viewport clip overlay badge */}
        {activeClip && (
          <div className="absolute top-3 left-3 z-20 bg-black/70 backdrop-blur-md px-2 py-0.5 rounded-md border border-white/10 text-[10px] font-mono text-zinc-300 pointer-events-none">
            {activeClip.assetId} • {activeClip.colorFilter !== 'none' && `${activeClip.colorFilter} • `}
            {(currentTime - activeClip.startTime).toFixed(1)}s / {activeClip.duration.toFixed(1)}s
          </div>
        )}

        {/* Click-to-play overlay */}
        <button
          type="button"
          onClick={togglePlay}
          className="absolute inset-0 z-10 flex items-center justify-center bg-black/20 opacity-0 group-hover/player:opacity-100 transition cursor-pointer"
        >
          <div className="w-14 h-14 rounded-full bg-black/70 backdrop-blur border border-white/20 flex items-center justify-center text-white shadow-2xl transition hover:scale-110">
            {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
          </div>
        </button>

        {/* Hidden Audio Elements */}
        {voAsset?.url && (
          <audio ref={voAudioRef} src={voAsset.url} preload="auto" />
        )}
        {bgmAsset?.url && (
          <audio ref={bgmAudioRef} src={bgmAsset.url} loop preload="auto" />
        )}
        </div>
      </div>

      {/* BOTTOM PLAYBACK CONTROLS BAR (Matte Dark Monochromatic) */}
      <div className="w-full bg-[#121214] border border-[#27272a] rounded-lg px-3 py-2 flex items-center justify-between gap-2 shadow-xs flex-shrink-0">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => handleSeekDelta(-5)}
            className="p-1.5 rounded-md text-zinc-400 hover:text-white hover:bg-[#18181b] transition cursor-pointer"
            title="Rewind 5s"
          >
            <Rewind className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={togglePlay}
            className="w-8 h-8 rounded-md bg-[#27272a] hover:bg-[#3f3f46] text-[#ededed] border border-zinc-600/80 flex items-center justify-center transition shadow-xs cursor-pointer"
            title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
          </button>

          <button
            type="button"
            onClick={() => handleSeekDelta(5)}
            className="p-1.5 rounded-md text-zinc-400 hover:text-white hover:bg-[#18181b] transition cursor-pointer"
            title="Forward 5s"
          >
            <FastForward className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => onTimeUpdate(0)}
            className="p-1.5 rounded-md text-zinc-400 hover:text-white hover:bg-[#18181b] transition cursor-pointer"
            title="Restart from 00:00"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Timecode */}
        <div className="font-mono text-xs font-bold text-zinc-200">
          <span className="text-white">{formatTimecode(currentTime)}</span>
          <span className="text-zinc-600 mx-1">/</span>
          <span className="text-zinc-500">{formatTimecode(totalDuration)}</span>
        </div>

        {/* Speed & Volume Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPlaybackSpeed(playbackSpeed === 1 ? 1.5 : playbackSpeed === 1.5 ? 2 : 1)}
            className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#18181b] hover:bg-[#27272a] text-zinc-300 border border-[#27272a] transition cursor-pointer"
            title="Playback Speed"
          >
            {playbackSpeed}x
          </button>

          <button
            type="button"
            onClick={() => setIsMuted(!isMuted)}
            className="p-1.5 rounded-md text-zinc-400 hover:text-white hover:bg-[#18181b] transition cursor-pointer"
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-zinc-400" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
