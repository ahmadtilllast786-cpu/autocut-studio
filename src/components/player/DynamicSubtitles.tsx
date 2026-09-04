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
  defaultStyle = 'capcut-karaoke',
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
      {/* 1. CapCut Bouncy Karaoke Style */}
      {(style === 'capcut-karaoke' || style === 'viral-highlight') && (
        <div className="bg-black/65 backdrop-blur-sm px-4 py-2 rounded-2xl flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1 shadow-2xl border border-white/10 transition-all">
          {currentSegment.words.map((w, idx) => {
            const isActive = currentTime >= w.start && currentTime <= w.end;
            const activeColor = w.color || '#facc15';

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

      {/* 2. Premiere Minimal Clean Style */}
      {(style === 'premiere-minimal' || style === 'minimal-white') && (
        <div className="px-4 py-1.5 rounded-lg flex flex-wrap items-center justify-center gap-x-1.5 text-center drop-shadow-[0_2px_10px_rgba(0,0,0,0.95)]">
          {currentSegment.words.map((w, idx) => {
            const isActive = currentTime >= w.start && currentTime <= w.end;
            return (
              <span
                key={`${w.word}_${idx}`}
                style={{ color: w.color || '#ffffff' }}
                className={`font-extrabold tracking-tight transition-opacity ${getResponsiveFontClass()} ${
                  isActive ? 'opacity-100 font-black' : 'opacity-80'
                }`}
              >
                {w.word}
              </span>
            );
          })}
        </div>
      )}

      {/* 3. Hormozi Pop Style */}
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
                  isActive ? 'scale-120 -translate-y-0.5' : 'scale-100'
                }`}
              >
                {w.word}
              </span>
            );
          })}
        </div>
      )}

      {/* 4. Cyber / Boxed Style */}
      {(style === 'cyber-boxed' || style === 'neon-cyber') && (
        <div className="bg-zinc-950/90 px-4 py-2 rounded-xl flex flex-wrap items-center justify-center gap-x-2 border border-cyan-500/50 shadow-[0_0_18px_rgba(6,182,212,0.4)]">
          {currentSegment.words.map((w, idx) => {
            const isActive = currentTime >= w.start && currentTime <= w.end;
            const cyberColor = w.color || (isActive ? '#22d3ee' : '#a1a1aa');

            return (
              <span
                key={`${w.word}_${idx}`}
                style={{ color: cyberColor }}
                className={`font-mono font-black uppercase transition-colors ${getResponsiveFontClass()} ${
                  isActive ? 'drop-shadow-[0_0_10px_rgba(34,211,238,0.9)]' : ''
                }`}
              >
                {w.word}
              </span>
            );
          })}
        </div>
      )}

      {/* 5. Cinematic Subtitle Style */}
      {(style === 'cinematic-subtitle' || style === 'classic-box') && (
        <div className="flex flex-col items-center justify-center px-4 py-1.5 rounded bg-black/60 backdrop-blur-xs border-b-2 border-zinc-400/40">
          <p className={`italic font-serif tracking-widest text-white/95 text-center ${getResponsiveFontClass()}`}>
            {currentSegment.text}
          </p>
        </div>
      )}
    </div>
  );
}
