'use client';

import React, { useRef } from 'react';
import { Timeline, MediaAsset } from '@/types/timeline';
import { Film, Mic, Music, Subtitles, Volume2, Sparkles } from 'lucide-react';
import { extractSpeechIntervals } from '@/lib/audioEngine';

interface VisualTimelineProps {
  timeline: Timeline;
  currentTime: number;
  onSeek: (time: number) => void;
  assets: MediaAsset[];
}

export function VisualTimeline({ timeline, currentTime, onSeek, assets }: VisualTimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const totalDuration = timeline.totalDuration || 60;
  const speechIntervals = extractSpeechIntervals(timeline.subtitles);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clickX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const newTime = (clickX / rect.width) * totalDuration;
    onSeek(Number(newTime.toFixed(2)));

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const moveX = Math.max(0, Math.min(moveEvent.clientX - rect.left, rect.width));
      const seekTime = (moveX / rect.width) * totalDuration;
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

  // Time ruler tick marks every 5 seconds
  const rulerTicks = [];
  for (let s = 0; s <= totalDuration; s += 5) {
    rulerTicks.push(s);
  }

  const getTransitionIcon = (trans: string) => {
    switch (trans) {
      case 'whip-pan':
        return '⚡ Whip';
      case 'zoom-snap':
        return '🔍 Snap';
      case 'glitch':
        return '👾 Glitch';
      case 'cross-dissolve':
        return '🔀 Dissolve';
      case 'slide-left':
        return '◀ Slide';
      default:
        return '• Cut';
    }
  };

  return (
    <div className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl p-3 flex flex-col gap-2 select-none shadow-inner">
      {/* Header Info */}
      <div className="flex items-center justify-between text-xs text-zinc-400 px-1">
        <div className="flex items-center gap-2">
          <span className="font-bold text-zinc-200">Timeline Multi-Track</span>
          <span className="text-zinc-600">•</span>
          <span className="text-[11px] font-mono text-indigo-400">
            {timeline.clips.length} Cuts
          </span>
        </div>
        <div className="flex items-center gap-3 font-mono text-[11px]">
          <span className="text-white font-bold">{formatTime(currentTime)}</span>
          <span className="text-zinc-600">/</span>
          <span className="text-zinc-400">{formatTime(totalDuration)}</span>
        </div>
      </div>

      {/* Interactive Timeline Track Surface */}
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        className="relative w-full bg-zinc-900/90 rounded-lg p-1.5 cursor-pointer border border-zinc-800 hover:border-zinc-700 transition overflow-hidden"
      >
        {/* Time Ruler */}
        <div className="relative h-5 border-b border-zinc-800 mb-1.5 flex items-center">
          {rulerTicks.map((sec) => {
            const leftPct = (sec / totalDuration) * 100;
            return (
              <div
                key={sec}
                className="absolute flex flex-col items-center -translate-x-1/2 pointer-events-none"
                style={{ left: `${leftPct}%` }}
              >
                <span className="text-[9px] font-mono text-zinc-500">{sec}s</span>
                <div className="w-px h-1.5 bg-zinc-700 mt-0.5" />
              </div>
            );
          })}
        </div>

        {/* TRACK 1: Video / Visuals */}
        <div className="relative h-9 bg-zinc-950/60 rounded-md mb-1.5 flex overflow-hidden border border-zinc-800/60">
          <div className="absolute left-1 top-0 bottom-0 flex items-center z-10 pointer-events-none">
            <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-tighter flex items-center gap-1 bg-zinc-950/80 px-1 rounded">
              <Film className="w-2.5 h-2.5 text-cyan-400" /> Visuals
            </span>
          </div>

          {timeline.clips.map((clip, idx) => {
            const widthPct = (clip.duration / totalDuration) * 100;
            const isVideo = clip.assetId.startsWith('VID');
            const isActive = currentTime >= clip.startTime && currentTime < clip.startTime + clip.duration;

            return (
              <div
                key={clip.id || idx}
                style={{ width: `${widthPct}%` }}
                className={`h-full border-r border-zinc-900 p-1 flex flex-col justify-center relative transition-colors ${
                  isActive
                    ? 'bg-indigo-600/30 border-t-2 border-t-indigo-400'
                    : isVideo
                    ? 'bg-cyan-950/30 hover:bg-cyan-950/50'
                    : 'bg-emerald-950/30 hover:bg-emerald-950/50'
                }`}
                title={`${clip.assetId} (${clip.startTime}s - ${(clip.startTime + clip.duration).toFixed(1)}s) | Transition: ${clip.transition} | Motion: ${clip.motionEffect}`}
              >
                <div className="flex items-center justify-between text-[10px] font-mono leading-none truncate">
                  <span className={`font-bold ${isVideo ? 'text-cyan-300' : 'text-emerald-300'}`}>
                    {clip.assetId}
                  </span>
                  {clip.transition !== 'none' && (
                    <span className="text-[8px] px-1 py-0.2 rounded bg-black/60 text-zinc-400 font-sans">
                      {getTransitionIcon(clip.transition)}
                    </span>
                  )}
                </div>
                <div className="text-[8px] text-zinc-500 font-mono mt-0.5 truncate">
                  {clip.duration.toFixed(1)}s {clip.motionEffect !== 'none' && `• ${clip.motionEffect}`}
                </div>
              </div>
            );
          })}
        </div>

        {/* TRACK 2: Voiceover Track */}
        <div className="relative h-6 bg-zinc-950/60 rounded-md mb-1.5 flex items-center overflow-hidden border border-zinc-800/60 px-1">
          <span className="absolute left-1 text-[9px] font-bold text-amber-400 uppercase tracking-tighter flex items-center gap-1 z-10 bg-zinc-950/80 px-1 rounded pointer-events-none">
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

        {/* TRACK 3: Background Music & Ducking Curve */}
        <div className="relative h-7 bg-zinc-950/60 rounded-md mb-1.5 flex items-center overflow-hidden border border-zinc-800/60 px-1">
          <span className="absolute left-1 text-[9px] font-bold text-purple-400 uppercase tracking-tighter flex items-center gap-1 z-10 bg-zinc-950/80 px-1 rounded pointer-events-none">
            <Music className="w-2.5 h-2.5" /> BG_MUSIC
          </span>

          {/* Music track base volume fill */}
          <div className="w-full h-3 bg-purple-500/10 rounded border border-purple-500/20 relative flex items-center">
            {/* Cutouts / dips representing the -16dB ducking envelope */}
            {speechIntervals.map((interval, idx) => {
              const leftPct = (interval.start / totalDuration) * 100;
              const widthPct = ((interval.end - interval.start) / totalDuration) * 100;
              return (
                <div
                  key={idx}
                  style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                  className="absolute h-1 bg-purple-500/40 border-t border-b border-purple-400/50 rounded flex items-center justify-center"
                  title="Auto-Ducking: Music attenuated by -16 dB during speech"
                >
                  <span className="text-[7px] text-purple-300 font-mono leading-none">
                    -16dB
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* TRACK 4: Subtitles Track */}
        <div className="relative h-5 bg-zinc-950/60 rounded-md flex items-center overflow-hidden border border-zinc-800/60 px-1">
          <span className="absolute left-1 text-[8px] font-bold text-zinc-400 uppercase tracking-tighter flex items-center gap-1 z-10 bg-zinc-950/80 px-1 rounded pointer-events-none">
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
                className={`absolute h-3 rounded px-1 flex items-center transition-colors ${
                  isSubActive
                    ? 'bg-yellow-400 text-black font-bold'
                    : 'bg-yellow-400/20 border border-yellow-400/30 text-yellow-300'
                }`}
                title={sub.text}
              >
                <span className="text-[7px] truncate">{sub.text}</span>
              </div>
            );
          })}
        </div>

        {/* PLAYHEAD SCRUBBER NEEDLE */}
        <div
          style={{ left: `${playheadPercent}%` }}
          className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-30 pointer-events-none shadow-[0_0_8px_rgba(239,68,68,0.8)]"
        >
          {/* Top needle head */}
          <div className="w-3 h-3 bg-red-500 rotate-45 -translate-x-1/2 -translate-y-1 rounded-xs" />
        </div>
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
