'use client';

import React from 'react';
import { SubtitleSegment, SubtitleStyleType, AspectRatioType } from '@/types/timeline';

interface DynamicSubtitlesProps {
  currentTime: number;
  subtitles: SubtitleSegment[];
  defaultStyle?: SubtitleStyleType;
  aspectRatio?: AspectRatioType;
}

export function DynamicSubtitles({
  currentTime,
  subtitles,
  defaultStyle = 'bouncy-karaoke',
  aspectRatio = '9:16',
}: DynamicSubtitlesProps) {
  if (!subtitles || subtitles.length === 0) return null;

  const currentSegment = subtitles.find(
    (sub) => currentTime >= sub.startTime && currentTime <= sub.endTime
  );

  if (!currentSegment) return null;

  const style = currentSegment.style || defaultStyle;

  // Responsive typography sizing based on aspect ratio
  const getResponsiveFontClass = () => {
    switch (aspectRatio) {
      case '16:9':
        return 'text-base sm:text-xl md:text-2xl';
      case '1:1':
        return 'text-sm sm:text-lg md:text-xl';
      case '9:16':
      default:
        return 'text-sm sm:text-base md:text-lg';
    }
  };

  return (
    <div className="w-full flex justify-center items-center pointer-events-none select-none max-w-[92%] px-2">
      {/* 1. Bouncy Karaoke (CapCut Inspired) */}
      {(style === 'bouncy-karaoke' || (style as string) === 'capcut-karaoke' || (style as string) === 'viral-highlight') && (
        <div className="bg-black/70 backdrop-blur-sm px-4 py-2 rounded-2xl flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1 shadow-2xl border border-white/10 transition-all">
          {currentSegment.words.map((w, idx) => {
            const isActive = currentTime >= w.start && currentTime <= w.end;
            const activeColor = w.color || '#facc15'; // Vibrant glowing yellow

            return (
              <span
                key={`${w.word}_${idx}`}
                style={{
                  color: isActive ? activeColor : w.color || '#ffffff',
                }}
                className={`font-black tracking-wider uppercase transition-all duration-100 ${getResponsiveFontClass()} ${
                  isActive
                    ? 'scale-115 -translate-y-1 drop-shadow-[0_0_12px_rgba(250,204,21,0.85)] [text-shadow:_0_3px_6px_#000,_0_0_12px_#000]'
                    : 'opacity-90 [text-shadow:_0_2px_4px_#000]'
                }`}
              >
                {w.word}
              </span>
            );
          })}
        </div>
      )}

      {/* 2. Hormozi Pop Style */}
      {style === 'hormozi-pop' && (
        <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center font-black uppercase tracking-tight">
          {currentSegment.words.map((w, idx) => {
            const isActive = currentTime >= w.start && currentTime <= w.end;
            const defaultHormoziColor = idx % 2 === 0 ? '#22c55e' : '#ef4444';
            const wordColor = w.color || (isActive ? defaultHormoziColor : '#ffffff');

            return (
              <span
                key={`${w.word}_${idx}`}
                style={{ color: wordColor }}
                className={`transition-transform duration-75 [text-shadow:_0_3px_0_#000,_0_0_10px_#000] ${getResponsiveFontClass()} ${
                  isActive ? 'scale-120 -translate-y-0.5 drop-shadow-[0_0_10px_rgba(34,197,94,0.8)]' : 'scale-100'
                }`}
              >
                {w.word}
              </span>
            );
          })}
        </div>
      )}

      {/* 3. Minimal Boxed Style */}
      {(style === 'minimal-boxed' || (style as string) === 'cyber-boxed' || (style as string) === 'premiere-minimal') && (
        <div className="bg-zinc-950/85 backdrop-blur-md px-4 py-2 rounded-xl flex flex-wrap items-center justify-center gap-x-2 border border-zinc-700/80 shadow-2xl">
          {currentSegment.words.map((w, idx) => {
            const isActive = currentTime >= w.start && currentTime <= w.end;
            const activeColor = w.color || '#38bdf8'; // Sky blue accent

            return (
              <span
                key={`${w.word}_${idx}`}
                style={{ color: isActive ? activeColor : w.color || '#f4f4f5' }}
                className={`font-bold tracking-normal transition-colors ${getResponsiveFontClass()} ${
                  isActive ? 'drop-shadow-[0_0_8px_rgba(56,189,248,0.7)] font-black' : 'opacity-85'
                }`}
              >
                {w.word}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
