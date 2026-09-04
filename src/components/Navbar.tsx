'use client';

import React from 'react';
import { Film, Sparkles, Settings, Download, RefreshCw, Layers } from 'lucide-react';

interface NavbarProps {
  onLoadSamples: () => void;
  onOpenSettings: () => void;
  onOpenExport: () => void;
  onResetLayout?: () => void;
  hasClips: boolean;
  activeProvider: string;
  aspectRatio?: string;
  activeStyle?: string;
}

export function Navbar({
  onLoadSamples,
  onOpenSettings,
  onOpenExport,
  onResetLayout,
  hasClips,
  activeProvider,
  aspectRatio = '9:16',
  activeStyle = 'capcut-karaoke',
}: NavbarProps) {
  return (
    <header className="h-16 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur px-4 lg:px-6 flex items-center justify-between z-30 sticky top-0">
      {/* Brand & Logo */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-violet-500 to-fuchsia-500 p-[1.5px] shadow-lg shadow-indigo-500/20">
          <div className="w-full h-full bg-zinc-950 rounded-[10px] flex items-center justify-center">
            <Film className="w-5 h-5 text-indigo-400" />
          </div>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-black tracking-tight text-white flex items-center gap-1.5">
              AutoCut <span className="bg-gradient-to-r from-indigo-400 to-fuchsia-400 bg-clip-text text-transparent">Studio</span>
            </h1>
            <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              {aspectRatio} AI • {activeStyle.replace('-', ' ')}
            </span>
          </div>
          <p className="text-xs text-zinc-400 hidden sm:block">
            Zero-Timeline Prompt-to-Video Engine
          </p>
        </div>
      </div>

      {/* Center Status / Model badge */}
      <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900/80 border border-zinc-800 text-xs">
        <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
        <span className="text-zinc-400">Director:</span>
        <span className="text-zinc-200 font-medium capitalize">{activeProvider.replace('-', ' ')}</span>
        <span className="text-zinc-600">|</span>
        <span className="text-zinc-400">Target:</span>
        <span className="text-emerald-400 font-mono font-bold">60.0s</span>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 sm:gap-3">
        {onResetLayout && (
          <button
            type="button"
            onClick={onResetLayout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-300 bg-[#18181b] hover:bg-[#27272a] border border-[#27272a] hover:border-[#00e5ff]/50 transition cursor-pointer"
            title="Reset workspace panels to default 4-quadrant docking layout"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#00e5ff]" />
            <span className="hidden sm:inline">Reset Layout</span>
          </button>
        )}

        <button
          type="button"
          onClick={onLoadSamples}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-300 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 transition cursor-pointer"
          title="Load pre-bundled royalty-free sample videos, images, and audio"
        >
          <Layers className="w-3.5 h-3.5 text-indigo-400" />
          <span className="hidden sm:inline">Load Sample Assets</span>
          <span className="sm:hidden">Samples</span>
        </button>

        <button
          type="button"
          onClick={onOpenSettings}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-200 bg-zinc-900/60 hover:bg-zinc-800/80 border border-zinc-800/80 transition cursor-pointer"
          title="Configure Gemini/OpenAI API Keys and Director Settings"
        >
          <Settings className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Settings</span>
        </button>

        <button
          type="button"
          onClick={onOpenExport}
          disabled={!hasClips}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold text-white shadow-lg transition cursor-pointer ${
            hasClips
              ? 'bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 hover:opacity-95 shadow-indigo-500/25 active:scale-95'
              : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
          }`}
        >
          <Download className="w-4 h-4" />
          <span>Export 1080x1920</span>
        </button>
      </div>
    </header>
  );
}
