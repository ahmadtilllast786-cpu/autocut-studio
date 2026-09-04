'use client';

import React from 'react';
import { SubtitleStyleType } from '@/types/timeline';
import { Sparkles, Check, Play } from 'lucide-react';

interface PresetItem {
  id: SubtitleStyleType;
  name: string;
  category: string;
  description: string;
  sampleWords: Array<{ text: string; active?: boolean; color?: string }>;
  badge?: string;
}

const PRESET_STYLES: PresetItem[] = [
  {
    id: 'capcut-karaoke',
    name: 'CapCut Bouncy Karaoke',
    category: 'Viral Short-Form',
    description: 'Bold sans, 8px black stroke, glowing yellow highlight with spring-bounce pop.',
    badge: 'Popular',
    sampleWords: [
      { text: 'WATCH', active: false },
      { text: 'THIS', active: true, color: '#facc15' },
      { text: 'POP', active: false },
    ],
  },
  {
    id: 'hormozi-pop',
    name: 'Hormozi Pop',
    category: 'Retention Heavy',
    description: 'Uppercase heavy, high-contrast black border with bold green & red accents.',
    badge: 'High CTR',
    sampleWords: [
      { text: 'SCALE', active: true, color: '#22c55e' },
      { text: 'YOUR', active: false },
      { text: 'REACH', active: true, color: '#ef4444' },
    ],
  },
  {
    id: 'premiere-minimal',
    name: 'Premiere Minimal Clean',
    category: 'Professional',
    description: 'Neutral Inter font, clean drop shadow, high readability sentence blocks.',
    sampleWords: [
      { text: 'Sleek', active: false },
      { text: 'clean', active: true, color: '#ffffff' },
      { text: 'minimal', active: false },
    ],
  },
  {
    id: 'cyber-boxed',
    name: 'Cyber / Boxed',
    category: 'Tech & Gaming',
    description: 'Dark pill badge backdrop, uppercase monospace, and glowing cyan accents.',
    badge: 'Sci-Fi',
    sampleWords: [
      { text: 'SYSTEM', active: false },
      { text: 'ONLINE', active: true, color: '#06b6d4' },
    ],
  },
  {
    id: 'cinematic-subtitle',
    name: 'Cinematic Subtitle',
    category: 'Narrative & Film',
    description: 'Bottom-third condensed serif, subtle dark underline, elegant aesthetic.',
    sampleWords: [
      { text: 'In', active: false },
      { text: 'the', active: false },
      { text: 'shadows', active: true, color: '#f8fafc' },
    ],
  },
];

interface CaptionPresetGalleryProps {
  currentStyle: SubtitleStyleType;
  onSelectStyle: (style: SubtitleStyleType) => void;
}

export function CaptionPresetGallery({
  currentStyle,
  onSelectStyle,
}: CaptionPresetGalleryProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          Preset Style Library (CapCut & Premiere)
        </label>
        <span className="text-[10px] text-zinc-500 font-mono">5 Presets</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2.5">
        {PRESET_STYLES.map((preset) => {
          const isSelected = currentStyle === preset.id;

          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => onSelectStyle(preset.id)}
              className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col gap-2 relative overflow-hidden group ${
                isSelected
                  ? 'border-indigo-500 bg-indigo-500/10 shadow-lg shadow-indigo-500/10'
                  : 'border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800/60 hover:border-zinc-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white">{preset.name}</span>
                  {preset.badge && (
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      {preset.badge}
                    </span>
                  )}
                </div>
                {isSelected && (
                  <div className="w-4 h-4 rounded-full bg-indigo-500 flex items-center justify-center text-white">
                    <Check className="w-2.5 h-2.5" />
                  </div>
                )}
              </div>

              <p className="text-[11px] text-zinc-400 leading-snug">
                {preset.description}
              </p>

              {/* Interactive Live Mini-Preview of the Caption Style */}
              <div className="h-10 w-full rounded-lg bg-black/60 border border-zinc-800/80 flex items-center justify-center px-3 overflow-hidden">
                {preset.id === 'capcut-karaoke' && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-black text-white [text-shadow:_0_2px_4px_#000]">
                      WATCH
                    </span>
                    <span className="text-sm font-black text-yellow-400 scale-110 drop-shadow-[0_0_8px_rgba(250,204,21,0.8)] [text-shadow:_0_2px_4px_#000]">
                      THIS
                    </span>
                    <span className="text-xs font-black text-white [text-shadow:_0_2px_4px_#000]">
                      POP
                    </span>
                  </div>
                )}

                {preset.id === 'hormozi-pop' && (
                  <div className="flex items-center gap-1.5 font-black uppercase text-xs">
                    <span className="text-emerald-400 scale-110 drop-shadow-[0_2px_4px_#000]">
                      SCALE
                    </span>
                    <span className="text-white">YOUR</span>
                    <span className="text-rose-500 scale-110 drop-shadow-[0_2px_4px_#000]">
                      REACH
                    </span>
                  </div>
                )}

                {preset.id === 'premiere-minimal' && (
                  <div className="text-xs font-medium text-white/95 tracking-normal drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
                    Clean, readable and centered
                  </div>
                )}

                {preset.id === 'cyber-boxed' && (
                  <div className="bg-zinc-950/90 px-2.5 py-1 rounded-md border border-cyan-500/40 shadow-[0_0_10px_rgba(6,182,212,0.3)] flex items-center gap-1.5">
                    <span className="text-[11px] font-mono font-bold text-zinc-400">SYS</span>
                    <span className="text-[11px] font-mono font-bold text-cyan-300 drop-shadow-[0_0_6px_rgba(6,182,212,0.8)]">
                      ONLINE
                    </span>
                  </div>
                )}

                {preset.id === 'cinematic-subtitle' && (
                  <div className="flex flex-col items-center">
                    <span className="text-xs italic font-serif text-slate-200 tracking-wider">
                      In the dramatic twilight
                    </span>
                    <div className="w-12 h-0.5 bg-slate-500/40 mt-0.5" />
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
