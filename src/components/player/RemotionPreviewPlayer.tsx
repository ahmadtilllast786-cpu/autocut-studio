'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Timeline, MediaAsset, SubtitleStyleType } from '@/types/timeline';
import { DynamicSubtitles } from './DynamicSubtitles';
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
  Maximize2,
} from 'lucide-react';

interface RemotionPreviewPlayerProps {
  timeline: Timeline;
  assets: MediaAsset[];
  currentTime: number;
  onTimeUpdate: React.Dispatch<React.SetStateAction<number>>;
}

export function RemotionPreviewPlayer({
  timeline,
  assets,
  currentTime,
  onTimeUpdate,
}: RemotionPreviewPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<1 | 1.5 | 2>(1);
  const [showSafeZone, setShowSafeZone] = useState(false);
  const [subtitleStyle, setSubtitleStyle] = useState<SubtitleStyleType>('viral-highlight');
  const [isCurrentlyDucking, setIsCurrentlyDucking] = useState(false);
  const [videoErrorMap, setVideoErrorMap] = useState<Record<string, boolean>>({});

  const videoElementRef = useRef<HTMLVideoElement>(null);
  const voAudioRef = useRef<HTMLAudioElement>(null);
  const bgmAudioRef = useRef<HTMLAudioElement>(null);
  const requestAnimRef = useRef<number | null>(null);
  const lastTimestampRef = useRef<number | null>(null);

  const totalDuration = timeline.totalDuration || 60;
  const speechIntervals = extractSpeechIntervals(timeline.subtitles);

  // Find active clip at currentTime
  const activeClip = timeline.clips.find(
    (c) => currentTime >= c.startTime && currentTime < c.startTime + c.duration
  ) || timeline.clips[timeline.clips.length - 1];

  const activeAsset = activeClip ? assets.find((a) => a.id === activeClip.assetId) : null;
  const isVideo = activeAsset?.type === 'video';

  const voAsset = assets.find((a) => a.id === 'VO_TRACK' || a.type === 'voiceover');
  const bgmAsset = assets.find((a) => a.id === 'BG_MUSIC' || a.type === 'music');

  // Time formatting
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

      // Play audio elements
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
    // Resume audio context on user interaction if needed
    SyntheticAudioProvider.getAudioContext();
    setIsPlaying(!isPlaying);
  };

  const handleSeekDelta = (delta: number) => {
    const newTime = Math.max(0, Math.min(totalDuration, currentTime + delta));
    onTimeUpdate(newTime);
  };

  // Compute CSS styles for Motion Effects and Transitions
  const clipProgress = activeClip
    ? Math.max(0, Math.min(1, (currentTime - activeClip.startTime) / activeClip.duration))
    : 0;

  const getMotionTransform = () => {
    if (!activeClip || isVideo) return '';
    switch (activeClip.motionEffect) {
      case 'ken-burns-zoom-in':
        return `scale(${1.0 + clipProgress * 0.18})`;
      case 'ken-burns-zoom-out':
        return `scale(${1.18 - clipProgress * 0.18})`;
      case 'pan-left':
        return `translateX(${(0.5 - clipProgress) * 35}px) scale(1.1)`;
      case 'pan-right':
        return `translateX(${(clipProgress - 0.5) * 35}px) scale(1.1)`;
      case 'pulse':
        return `scale(${1.0 + Math.sin(clipProgress * Math.PI * 2) * 0.06})`;
      case 'shake':
        return `translateX(${Math.sin(clipProgress * 30) * 4}px)`;
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

  return (
    <div className="flex flex-col items-center justify-between h-full bg-zinc-950/60 p-3 sm:p-4 gap-3">
      {/* Top Bar Controls */}
      <div className="w-full flex items-center justify-between px-2 text-xs">
        {/* Aspect Ratio & Ducking Indicator Badge */}
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 font-mono text-[10px] font-bold border border-zinc-700">
            9:16 Vertical
          </span>

          {isCurrentlyDucking && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-mono border border-purple-500/40 animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
              Ducking -16dB
            </span>
          )}
        </div>

        {/* Subtitle Style & Safe Zone Toggles */}
        <div className="flex items-center gap-2">
          <select
            value={subtitleStyle}
            onChange={(e) => setSubtitleStyle(e.target.value as SubtitleStyleType)}
            className="bg-zinc-900 border border-zinc-800 rounded-md px-2 py-1 text-[11px] text-zinc-300 focus:outline-none"
            title="Subtitle Visual Style"
          >
            <option value="viral-highlight">⚡ Viral Pop (Hormozi)</option>
            <option value="neon-cyber">🌐 Neon Cyber</option>
            <option value="minimal-white">✨ Minimal White</option>
            <option value="classic-box">⬛ Classic Box</option>
          </select>

          <button
            type="button"
            onClick={() => setShowSafeZone(!showSafeZone)}
            className={`p-1.5 rounded-md border text-[11px] transition cursor-pointer flex items-center gap-1 ${
              showSafeZone
                ? 'bg-indigo-600 border-indigo-500 text-white'
                : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
            }`}
            title="Toggle TikTok / Instagram Reels Safe Zone Overlay"
          >
            {showSafeZone ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">Safe Zone</span>
          </button>
        </div>
      </div>

      {/* 9:16 VERTICAL PLAYER VIEWPORT */}
      <div className="relative w-full flex-1 max-w-[340px] max-h-[580px] aspect-[9/16] bg-black rounded-2xl overflow-hidden shadow-2xl border-2 border-zinc-800 flex items-center justify-center select-none group">
        {/* Layer 1: Visual Media Content */}
        <div
          className={`w-full h-full relative overflow-hidden transition-all duration-300 ${getColorFilterClass()}`}
        >
          {isVideo && activeAsset && !videoErrorMap[activeAsset.id] ? (
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
              className="w-full h-full object-cover pointer-events-none"
            />
          ) : activeAsset?.thumbnailUrl || activeAsset?.type === 'image' ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={activeAsset.type === 'image' ? activeAsset.url : activeAsset.thumbnailUrl}
              alt={activeAsset.name}
              style={{
                transform: getMotionTransform(),
                transition: 'transform 0.1s linear',
              }}
              className="w-full h-full object-cover pointer-events-none"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-zinc-950 text-zinc-600">
              <Sparkles className="w-8 h-8 mb-2 text-indigo-400 opacity-40 animate-pulse" />
              <p className="text-xs font-semibold text-zinc-400">Ready to Direct</p>
              <p className="text-[10px] text-zinc-600 mt-1">Upload media or load sample pack</p>
            </div>
          )}

          {/* Transition Visual Overlay (Whip-pan, Zoom-snap, Glitch) */}
          {isTransitioning && activeClip && (
            <div
              className={`absolute inset-0 pointer-events-none z-10 ${
                activeClip.transition === 'glitch'
                  ? 'backdrop-invert mix-blend-difference'
                  : activeClip.transition === 'whip-pan'
                  ? 'backdrop-blur-sm bg-black/40'
                  : 'bg-black/30 backdrop-blur-[2px]'
              }`}
            />
          )}
        </div>

        {/* Layer 2: Dynamic Auto-Subtitles (Word-by-word synced) */}
        <DynamicSubtitles
          currentTime={currentTime}
          subtitles={timeline.subtitles}
          defaultStyle={subtitleStyle}
        />

        {/* Layer 3: TikTok / Reels Safe Zone Overlay */}
        {showSafeZone && (
          <div className="absolute inset-0 pointer-events-none z-20 border-x-4 border-dashed border-red-500/30">
            {/* Top header safe zone */}
            <div className="absolute top-0 inset-x-0 h-14 bg-red-500/10 border-b border-dashed border-red-500/40 flex items-center justify-center text-[10px] font-mono text-red-400">
              Top Safe Zone (Nav / Live)
            </div>
            {/* Right sidebar action buttons safe zone */}
            <div className="absolute right-0 top-16 bottom-24 w-14 bg-red-500/10 border-l border-dashed border-red-500/40 flex flex-col items-center justify-center text-[9px] font-mono text-red-400 p-1 text-center">
              Like / Share UI Safe Area
            </div>
            {/* Bottom safe zone for captions / song info */}
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
          className="absolute inset-0 z-10 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition cursor-pointer"
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

      {/* BOTTOM PLAYBACK CONTROLS BAR */}
      <div className="w-full bg-zinc-900/90 border border-zinc-800 rounded-xl p-3 flex items-center justify-between gap-2 shadow-lg">
        {/* Play/Pause & Skip Buttons */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => handleSeekDelta(-5)}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
            title="Rewind 5s"
          >
            <Rewind className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={togglePlay}
            className="w-9 h-9 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center transition shadow-md shadow-indigo-600/30 cursor-pointer"
            title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
          </button>

          <button
            type="button"
            onClick={() => handleSeekDelta(5)}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
            title="Forward 5s"
          >
            <FastForward className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => onTimeUpdate(0)}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
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
          {/* Speed Toggle */}
          <button
            type="button"
            onClick={() => setPlaybackSpeed(playbackSpeed === 1 ? 1.5 : playbackSpeed === 1.5 ? 2 : 1)}
            className="px-2 py-1 rounded text-[11px] font-mono font-bold bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition cursor-pointer"
            title="Playback Speed"
          >
            {playbackSpeed}x
          </button>

          {/* Mute Button */}
          <button
            type="button"
            onClick={() => setIsMuted(!isMuted)}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
