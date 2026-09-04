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
    <header className="h-[52px] border-b border-[#27272a] bg-[#121214] px-4 flex items-center justify-between z-30 select-none">
      {/* Brand & Logo */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-md bg-[#18181b] border border-[#27272a] flex items-center justify-center">
          <Film className="w-4 h-4 text-zinc-300" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-semibold tracking-tight text-[#ededed]">
              AutoCut Studio
            </h1>
            <span className="px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider rounded bg-[#18181b] text-zinc-400 border border-[#27272a]">
              {aspectRatio} • {activeStyle.replace('-', ' ')}
            </span>
          </div>
          <p className="text-[11px] text-zinc-500 hidden sm:block leading-none mt-0.5">
            Zero-Timeline Prompt-to-Video Engine
          </p>
        </div>
      </div>

      {/* Center Status / Model badge */}
      <div className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded bg-[#18181b] border border-[#27272a] text-xs">
        <Sparkles className="w-3.5 h-3.5 text-zinc-400" />
        <span className="text-zinc-500">Director:</span>
        <span className="text-zinc-300 font-medium capitalize">{activeProvider.replace('-', ' ')}</span>
        <span className="text-zinc-700">|</span>
        <span className="text-zinc-500">Target:</span>
        <span className="text-zinc-300 font-mono font-medium">60.0s</span>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2">
        {onResetLayout && (
          <button
            type="button"
            onClick={onResetLayout}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium text-zinc-300 bg-[#18181b] hover:bg-[#27272a] border border-[#27272a] transition cursor-pointer"
            title="Reset workspace panels to default layout"
          >
            <RefreshCw className="w-3.5 h-3.5 text-zinc-400" />
            <span className="hidden sm:inline">Reset Layout</span>
          </button>
        )}

        <button
          type="button"
          onClick={onLoadSamples}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium text-zinc-300 bg-[#18181b] hover:bg-[#27272a] border border-[#27272a] transition cursor-pointer"
          title="Load pre-bundled royalty-free sample assets"
        >
          <Layers className="w-3.5 h-3.5 text-zinc-400" />
          <span className="hidden sm:inline">Load Samples</span>
          <span className="sm:hidden">Samples</span>
        </button>

        <button
          type="button"
          onClick={onOpenSettings}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium text-zinc-400 hover:text-zinc-200 bg-[#18181b] hover:bg-[#27272a] border border-[#27272a] transition cursor-pointer"
          title="Configure API Keys and Director Settings"
        >
          <Settings className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Settings</span>
        </button>

        <button
          type="button"
          onClick={onOpenExport}
          disabled={!hasClips}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition cursor-pointer ${
            hasClips
              ? 'bg-[#27272a] hover:bg-[#3f3f46] text-[#ededed] border border-[#3f3f46] active:scale-95'
              : 'bg-[#18181b] text-zinc-600 border border-[#27272a] cursor-not-allowed'
          }`}
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export 1080x1920</span>
        </button>
      </div>
    </header>
  );
}
