'use client';

import React from 'react';
import { SubtitleSegment, SubtitleStyleType } from '@/types/timeline';

interface DynamicSubtitlesProps {
  currentTime: number;
  subtitles: SubtitleSegment[];
  defaultStyle?: SubtitleStyleType;
}

export function DynamicSubtitles({
  currentTime,
  subtitles,
  defaultStyle = 'viral-highlight',
}: DynamicSubtitlesProps) {
  if (!subtitles || subtitles.length === 0) return null;

  const currentSegment = subtitles.find(
    (sub) => currentTime >= sub.startTime && currentTime <= sub.endTime
  );

  if (!currentSegment) return null;

  const style = currentSegment.style || defaultStyle;

  return (
    <div className="absolute inset-x-4 bottom-[24%] z-20 flex justify-center items-center pointer-events-none select-none">
      {style === 'viral-highlight' && (
        <div className="bg-black/70 backdrop-blur-sm px-4 py-2 rounded-2xl flex flex-wrap items-center justify-center gap-x-2 gap-y-1 shadow-2xl border border-white/10 max-w-[90%] transition-all">
          {currentSegment.words.map((w, idx) => {
            const isActive = currentTime >= w.start && currentTime <= w.end;
            return (
              <span
                key={`${w.word}_${idx}`}
                className={`text-sm sm:text-base md:text-lg font-black tracking-wide uppercase transition-all duration-100 ${
                  isActive
                    ? 'text-yellow-400 scale-110 -translate-y-0.5 drop-shadow-[0_4px_8px_rgba(250,204,21,0.5)] [text-shadow:_0_2px_4px_rgb(0_0_0_/_90%),_0_0_8px_rgb(0_0_0)]'
                    : 'text-white/90 [text-shadow:_0_2px_4px_rgb(0_0_0_/_80%)]'
                }`}
              >
                {w.word}
              </span>
            );
          })}
        </div>
      )}

      {style === 'neon-cyber' && (
        <div className="bg-zinc-950/80 px-4 py-2 rounded-xl flex flex-wrap items-center justify-center gap-x-2 border border-cyan-500/40 shadow-[0_0_15px_rgba(6,182,212,0.3)] max-w-[90%]">
          {currentSegment.words.map((w, idx) => {
            const isActive = currentTime >= w.start && currentTime <= w.end;
            return (
              <span
                key={`${w.word}_${idx}`}
                className={`text-sm sm:text-base font-black uppercase font-mono transition-colors ${
                  isActive
                    ? 'text-cyan-300 drop-shadow-[0_0_10px_rgba(6,182,212,0.9)]'
                    : 'text-zinc-400'
                }`}
              >
                {w.word}
              </span>
            );
          })}
        </div>
      )}

      {style === 'minimal-white' && (
        <div className="px-4 py-1.5 rounded-lg flex flex-wrap items-center justify-center gap-x-1.5 text-center drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
          {currentSegment.words.map((w, idx) => {
            const isActive = currentTime >= w.start && currentTime <= w.end;
            return (
              <span
                key={`${w.word}_${idx}`}
                className={`text-sm sm:text-base font-extrabold tracking-tight transition-opacity ${
                  isActive ? 'text-white opacity-100' : 'text-white/70'
                }`}
              >
                {w.word}
              </span>
            );
          })}
        </div>
      )}

      {style === 'classic-box' && (
        <div className="bg-black/90 px-3 py-1 rounded-md text-xs sm:text-sm font-bold text-white text-center shadow-lg">
          {currentSegment.text}
        </div>
      )}
    </div>
  );
}
