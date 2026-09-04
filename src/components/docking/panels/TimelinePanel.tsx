'use client';

import React, { useState, useRef } from 'react';
import { Timeline, MediaAsset, TimelineClip } from '@/types/timeline';
import { extractSpeechIntervals } from '@/lib/audioEngine';
import {
  Scissors,
  Magnet,
  Layers,
  Mic,
  ZoomIn,
  ZoomOut,
  Film,
  Music,
  Subtitles,
  Sparkles,
  Plus,
} from 'lucide-react';

interface TimelinePanelProps {
  timeline: Timeline;
  assets: MediaAsset[];
  currentTime: number;
  onSeek: (time: number) => void;
  onUpdateClips?: (clips: TimelineClip[]) => void;
}

export function TimelinePanel({
  timeline,
  assets,
  currentTime,
  onSeek,
  onUpdateClips,
}: TimelinePanelProps) {
  const [zoomLevel, setZoomLevel] = useState<number>(1.0); // 0.8x to 2.5x
  const [magnetSnapping, setMagnetSnapping] = useState<boolean>(true);
  const [rippleEdit, setRippleEdit] = useState<boolean>(true);
  const [isRecording, setIsRecording] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const totalDuration = timeline.totalDuration || 60;
  const speechIntervals = extractSpeechIntervals(timeline.subtitles);

  // Blade tool: split the clip under playhead into two clips
  const handleBladeSplit = () => {
    const clipIdx = timeline.clips.findIndex(
      (c) => currentTime > c.startTime && currentTime < c.startTime + c.duration
    );
    if (clipIdx === -1) return;

    const targetClip = timeline.clips[clipIdx];
    const firstDuration = Number((currentTime - targetClip.startTime).toFixed(2));
    const secondDuration = Number((targetClip.duration - firstDuration).toFixed(2));

    if (firstDuration < 0.3 || secondDuration < 0.3) return;

    const clip1: TimelineClip = {
      ...targetClip,
      id: `${targetClip.id}_a`,
      duration: firstDuration,
    };

    const clip2: TimelineClip = {
      ...targetClip,
      id: `${targetClip.id}_b`,
      startTime: currentTime,
      duration: secondDuration,
      sourceStart: Number((targetClip.sourceStart + firstDuration).toFixed(2)),
      transition: 'none',
    };

    const newClips = [
      ...timeline.clips.slice(0, clipIdx),
      clip1,
      clip2,
      ...timeline.clips.slice(clipIdx + 1),
    ];

    onUpdateClips?.(newClips);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clickX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    let newTime = (clickX / rect.width) * totalDuration;

    // Magnet snapping to closest cut boundary
    if (magnetSnapping) {
      for (const clip of timeline.clips) {
        if (Math.abs(newTime - clip.startTime) < 0.6) {
          newTime = clip.startTime;
          break;
        }
        if (Math.abs(newTime - (clip.startTime + clip.duration)) < 0.6) {
          newTime = clip.startTime + clip.duration;
          break;
        }
      }
    }

    onSeek(Number(newTime.toFixed(2)));

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const moveX = Math.max(0, Math.min(moveEvent.clientX - rect.left, rect.width));
      let seekTime = (moveX / rect.width) * totalDuration;

      if (magnetSnapping) {
        for (const clip of timeline.clips) {
          if (Math.abs(seekTime - clip.startTime) < 0.6) {
            seekTime = clip.startTime;
            break;
          }
          if (Math.abs(seekTime - (clip.startTime + clip.duration)) < 0.6) {
            seekTime = clip.startTime + clip.duration;
            break;
          }
        }
      }

      onSeek(Number(seekTime.toFixed(2)));
    };

    const handlePointerUp = () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  const playheadPercent = Math.min(100, (currentTime / totalDuration) * 100);

  // Time ruler ticks every 5 seconds
  const rulerTicks = [];
  for (let s = 0; s <= totalDuration; s += 5) {
    rulerTicks.push(s);
  }

  const getTransitionBadge = (trans: string) => {
    switch (trans) {
      case 'punch_in':
        return '🥊 Punch In';
      case 'whip_pan':
      case 'whip-pan':
        return '⚡ Whip Pan';
      case 'ken_burns_zoom':
        return '🔍 Ken Burns';
      case 'white_flash':
        return '✨ White Flash';
      case 'zoom-snap':
        return '🔍 Snap';
      case 'glitch':
        return '👾 Glitch';
      case 'cross-dissolve':
        return '🔀 Dissolve';
      case 'slide-left':
        return '◀ Slide';
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#121214] text-zinc-200 select-none overflow-hidden">
      {/* 1. Timeline Header Controls Toolbar */}
      <div className="h-10 border-b border-[#27272a] bg-[#121214] px-3 flex items-center justify-between gap-3 flex-shrink-0">
        <div className="flex items-center gap-1.5">
          {/* Blade Tool */}
          <button
            type="button"
            onClick={handleBladeSplit}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#18181b] hover:bg-[#27272a] text-zinc-200 text-xs font-bold border border-[#27272a] hover:border-[#00e5ff] transition cursor-pointer"
            title="Blade Tool: Split active clip at playhead position"
          >
            <Scissors className="w-3.5 h-3.5 text-[#00e5ff]" />
            <span className="hidden sm:inline">Split</span>
          </button>

          {/* Ripple Edit Toggle */}
          <button
            type="button"
            onClick={() => setRippleEdit(!rippleEdit)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-bold border transition cursor-pointer ${
              rippleEdit
                ? 'bg-[#00e5ff]/15 border-[#00e5ff]/40 text-[#00e5ff]'
                : 'bg-[#18181b] border-[#27272a] text-zinc-400 hover:text-white'
            }`}
            title="Ripple Edit Mode"
          >
            <Layers className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Ripple</span>
          </button>

          {/* Magnet Snapping Toggle */}
          <button
            type="button"
            onClick={() => setMagnetSnapping(!magnetSnapping)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-bold border transition cursor-pointer ${
              magnetSnapping
                ? 'bg-[#00e5ff]/15 border-[#00e5ff]/40 text-[#00e5ff]'
                : 'bg-[#18181b] border-[#27272a] text-zinc-400 hover:text-white'
            }`}
            title="Magnet Snapping to clip boundaries"
          >
            <Magnet className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Snap</span>
          </button>

          {/* Record Voiceover */}
          <button
            type="button"
            onClick={() => setIsRecording(!isRecording)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-bold border transition cursor-pointer ${
              isRecording
                ? 'bg-red-500/20 border-red-500/50 text-red-400 animate-pulse'
                : 'bg-[#18181b] border-[#27272a] text-zinc-400 hover:text-white'
            }`}
            title="Record Voiceover"
          >
            <Mic className="w-3.5 h-3.5 text-red-400" />
            <span className="hidden sm:inline">Record</span>
          </button>
        </div>

        {/* Timecode & Zoom Slider */}
        <div className="flex items-center gap-4">
          <div className="font-mono text-xs font-bold text-zinc-200">
            <span className="text-[#00e5ff]">{formatTime(currentTime)}</span>
            <span className="text-zinc-600 mx-1">/</span>
            <span className="text-zinc-500">{formatTime(totalDuration)}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <ZoomOut className="w-3 h-3 text-zinc-500" />
            <input
              type="range"
              min={0.8}
              max={2.0}
              step={0.1}
              value={zoomLevel}
              onChange={(e) => setZoomLevel(Number(e.target.value))}
              className="w-16 accent-[#00e5ff] bg-[#27272a] h-1 rounded cursor-pointer"
              title="Timeline Track Zoom"
            />
            <ZoomIn className="w-3 h-3 text-zinc-500" />
          </div>
        </div>
      </div>

      {/* 2. Interactive Multi-Track Scroll Area */}
      <div className="flex-1 overflow-x-auto overflow-y-auto p-3 bg-[#18181b]">
        {timeline.clips.length === 0 ? (
          /* Empty Placeholder as specified */
          <div className="h-44 border-2 border-dashed border-[#27272a] rounded-xl flex flex-col items-center justify-center text-center p-6 text-zinc-500">
            <Plus className="w-8 h-8 mb-2 text-[#00e5ff] opacity-40" />
            <p className="text-sm font-semibold text-zinc-300">
              Drag material here and start to create
            </p>
            <p className="text-xs text-zinc-500 mt-1">
              Upload raw assets or click &quot;Sample Pack&quot; in the Media Drawer
            </p>
          </div>
        ) : (
          <div
            ref={containerRef}
            onPointerDown={handlePointerDown}
            style={{ width: `${Math.max(100, zoomLevel * 100)}%` }}
            className="relative bg-[#121214] rounded-xl p-2 cursor-pointer border border-[#27272a] hover:border-[#3f3f46] transition flex flex-col gap-1.5 shadow-inner"
          >
            {/* Time Ruler */}
            <div className="relative h-5 border-b border-[#27272a] mb-1 flex items-center">
              {rulerTicks.map((sec) => {
                const leftPct = (sec / totalDuration) * 100;
                return (
                  <div
                    key={sec}
                    className="absolute flex flex-col items-center -translate-x-1/2 pointer-events-none"
                    style={{ left: `${leftPct}%` }}
                  >
                    <span className="text-[9px] font-mono text-zinc-500">{sec}s</span>
                    <div className="w-px h-1.5 bg-[#27272a] mt-0.5" />
                  </div>
                );
              })}
            </div>

            {/* TRACK 1: Dynamic Captions Track */}
            <div className="relative h-6 bg-[#0d0d0f] rounded-md flex items-center overflow-hidden border border-[#27272a] px-1">
              <span className="absolute left-1 text-[8px] font-bold text-yellow-400 uppercase tracking-tighter flex items-center gap-1 z-10 bg-black/80 px-1 rounded pointer-events-none">
                <Subtitles className="w-2.5 h-2.5 text-yellow-400" /> Captions
              </span>

              {timeline.subtitles.map((sub) => {
                const leftPct = (sub.startTime / totalDuration) * 100;
                const widthPct = ((sub.endTime - sub.startTime) / totalDuration) * 100;
                const isSubActive = currentTime >= sub.startTime && currentTime <= sub.endTime;

                return (
                  <div
                    key={sub.id}
                    style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                    className={`absolute h-4 rounded px-1 flex items-center transition-colors ${
                      isSubActive
                        ? 'bg-yellow-400 text-black font-bold'
                        : 'bg-yellow-400/20 border border-yellow-400/30 text-yellow-300'
                    }`}
                    title={sub.text}
                  >
                    <span className="text-[8px] truncate">{sub.text}</span>
                  </div>
                );
              })}
            </div>

            {/* TRACK 2: Main Video & Static Visual Cuts Track */}
            <div className="relative h-12 bg-[#0d0d0f] rounded-md flex overflow-hidden border border-[#27272a]">
              <div className="absolute left-1 top-0 bottom-0 flex items-center z-10 pointer-events-none">
                <span className="text-[9px] font-bold text-zinc-300 uppercase tracking-tighter flex items-center gap-1 bg-black/80 px-1 rounded">
                  <Film className="w-2.5 h-2.5 text-[#00e5ff]" /> Main Video
                </span>
              </div>

              {timeline.clips.map((clip, idx) => {
                const widthPct = (clip.duration / totalDuration) * 100;
                const isVideo = clip.assetId.startsWith('VID');
                const isActive =
                  currentTime >= clip.startTime && currentTime < clip.startTime + clip.duration;
                const transBadge = getTransitionBadge(clip.transition);

                return (
                  <div
                    key={clip.id || idx}
                    style={{ width: `${widthPct}%` }}
                    className={`h-full border-r border-[#121214] p-1 flex flex-col justify-center relative transition-colors ${
                      isActive
                        ? 'bg-[#00e5ff]/25 border-t-2 border-t-[#00e5ff]'
                        : isVideo
                        ? 'bg-cyan-950/30 hover:bg-cyan-950/50'
                        : 'bg-emerald-950/30 hover:bg-emerald-950/50'
                    }`}
                    title={`${clip.assetId} (${clip.startTime}s - ${(clip.startTime + clip.duration).toFixed(1)}s)`}
                  >
                    <div className="flex items-center justify-between text-[10px] font-mono leading-none truncate">
                      <span className={`font-bold ${isVideo ? 'text-cyan-300' : 'text-emerald-300'}`}>
                        {clip.assetId}
                      </span>
                      {transBadge && (
                        <span className="text-[8px] px-1 py-0.2 rounded bg-black/60 text-zinc-300">
                          {transBadge}
                        </span>
                      )}
                    </div>
                    <div className="text-[8px] text-zinc-500 font-mono mt-1 truncate">
                      {clip.duration.toFixed(1)}s {clip.motionEffect !== 'none' && `• ${clip.motionEffect}`}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* TRACK 3: Overlay / B-Roll Track */}
            <div className="relative h-6 bg-[#0d0d0f] rounded-md flex items-center overflow-hidden border border-[#27272a] px-1">
              <span className="absolute left-1 text-[8px] font-bold text-zinc-500 uppercase tracking-tighter flex items-center gap-1 z-10 bg-black/80 px-1 rounded pointer-events-none">
                <Layers className="w-2.5 h-2.5 text-zinc-500" /> Overlay / B-Roll
              </span>
              <div className="w-full text-center text-[9px] text-zinc-600 font-mono">
                Empty Layer
              </div>
            </div>

            {/* TRACK 4: Voiceover Track (VO_TRACK) */}
            <div className="relative h-7 bg-[#0d0d0f] rounded-md flex items-center overflow-hidden border border-[#27272a] px-1">
              <span className="absolute left-1 text-[8px] font-bold text-amber-400 uppercase tracking-tighter flex items-center gap-1 z-10 bg-black/80 px-1 rounded pointer-events-none">
                <Mic className="w-2.5 h-2.5" /> VO_TRACK
              </span>

              {speechIntervals.map((interval, idx) => {
                const leftPct = (interval.start / totalDuration) * 100;
                const widthPct = ((interval.end - interval.start) / totalDuration) * 100;
                const isSpeakingNow = currentTime >= interval.start && currentTime <= interval.end;

                return (
                  <div
                    key={idx}
                    style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                    className={`absolute h-4 rounded px-1 flex items-center transition-colors ${
                      isSpeakingNow
                        ? 'bg-amber-500 text-zinc-950 font-bold'
                        : 'bg-amber-500/20 border border-amber-500/30 text-amber-300'
                    }`}
                  >
                    <span className="text-[8px] font-mono truncate">Speech</span>
                  </div>
                );
              })}
            </div>

            {/* TRACK 5: Background Music Track (BG_MUSIC) with Ducking */}
            <div className="relative h-7 bg-[#0d0d0f] rounded-md flex items-center overflow-hidden border border-[#27272a] px-1">
              <span className="absolute left-1 text-[8px] font-bold text-purple-400 uppercase tracking-tighter flex items-center gap-1 z-10 bg-black/80 px-1 rounded pointer-events-none">
                <Music className="w-2.5 h-2.5" /> BG_MUSIC
              </span>

              <div className="w-full h-3 bg-purple-500/15 rounded border border-purple-500/25 relative flex items-center">
                {speechIntervals.map((interval, idx) => {
                  const leftPct = (interval.start / totalDuration) * 100;
                  const widthPct = ((interval.end - interval.start) / totalDuration) * 100;
                  return (
                    <div
                      key={idx}
                      style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                      className="absolute h-1 bg-purple-500/50 border-t border-b border-purple-400/60 rounded flex items-center justify-center"
                      title="Auto-Ducking: -16 dB during speech"
                    >
                      <span className="text-[7px] text-purple-200 font-mono leading-none">
                        -16dB
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* PLAYHEAD SCRUBBER NEEDLE */}
            <div
              style={{ left: `${playheadPercent}%` }}
              className="absolute top-0 bottom-0 w-0.5 bg-[#00e5ff] z-30 pointer-events-none shadow-[0_0_10px_#00e5ff]"
            >
              <div className="w-3 h-3 bg-[#00e5ff] rotate-45 -translate-x-1/2 -translate-y-1 rounded-xs" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 10);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${ms}`;
}
