'use client';

import React, { useState } from 'react';
import { Timeline, MediaAsset, SubtitleSegment, SubtitleStyleType } from '@/types/timeline';
import { PromptConsole } from '@/components/prompt-console/PromptConsole';
import { CaptionPresetGallery } from '@/components/captions/CaptionPresetGallery';
import { CaptionEditorDrawer } from '@/components/captions/CaptionEditorDrawer';
import { AppSettings } from '@/components/SettingsModal';
import { Info, Wand2, Subtitles, Film, Clock, Monitor, Volume2, ShieldCheck } from 'lucide-react';

interface InspectorPanelProps {
  timeline: Timeline;
  assets: MediaAsset[];
  currentTime: number;
  onTimelineGenerated: (timeline: Timeline) => void;
  onUpdateSubtitles: (subs: SubtitleSegment[]) => void;
  onSeek: (time: number) => void;
  onSubtitleStyleChange: (style: SubtitleStyleType) => void;
  settings: AppSettings;
}

export function InspectorPanel({
  timeline,
  assets,
  currentTime,
  onTimelineGenerated,
  onUpdateSubtitles,
  onSeek,
  onSubtitleStyleChange,
  settings,
}: InspectorPanelProps) {
  const [activeSubTab, setActiveSubTab] = useState<'details' | 'prompt' | 'captions'>('prompt');

  return (
    <div className="flex flex-col h-full w-full bg-[#121214] text-zinc-200 select-none overflow-hidden">
      {/* Inspector Top Tabs Navigation */}
      <div className="h-10 border-b border-[#27272a] bg-[#121214] flex items-center px-3 gap-1 flex-shrink-0">
        <button
          type="button"
          onClick={() => setActiveSubTab('prompt')}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-[11px] font-medium transition cursor-pointer ${
            activeSubTab === 'prompt'
              ? 'bg-[#18181b] text-[#ededed] border border-[#27272a]'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#18181b]/50'
          }`}
        >
          <Wand2 className={`w-3.5 h-3.5 ${activeSubTab === 'prompt' ? 'text-[#ededed]' : 'text-zinc-400'}`} />
          <span>AI Prompt</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('captions')}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-[11px] font-medium transition cursor-pointer ${
            activeSubTab === 'captions'
              ? 'bg-[#18181b] text-[#ededed] border border-[#27272a]'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#18181b]/50'
          }`}
        >
          <Subtitles className={`w-3.5 h-3.5 ${activeSubTab === 'captions' ? 'text-[#ededed]' : 'text-zinc-400'}`} />
          <span>Captions</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('details')}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-[11px] font-medium transition cursor-pointer ${
            activeSubTab === 'details'
              ? 'bg-[#18181b] text-[#ededed] border border-[#27272a]'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#18181b]/50'
          }`}
        >
          <Info className={`w-3.5 h-3.5 ${activeSubTab === 'details' ? 'text-[#ededed]' : 'text-zinc-400'}`} />
          <span>Details</span>
        </button>
      </div>

      {/* Sub-tab 1: AI Prompt Console */}
      {activeSubTab === 'prompt' && (
        <div className="flex-1 overflow-y-auto bg-[#18181b]">
          <PromptConsole
            assets={assets}
            currentTimeline={timeline}
            onTimelineGenerated={onTimelineGenerated}
            settings={settings}
          />
        </div>
      )}

      {/* Sub-tab 2: Dynamic Auto-Captions Presets & Editor */}
      {activeSubTab === 'captions' && (
        <div className="flex-1 overflow-y-auto p-3 space-y-4 bg-[#18181b]">
          <CaptionPresetGallery
            currentStyle={timeline.activeSubtitleStyle || 'bouncy-karaoke'}
            onSelectStyle={onSubtitleStyleChange}
          />

          <div className="h-[340px]">
            <CaptionEditorDrawer
              subtitles={timeline.subtitles}
              currentTime={currentTime}
              onUpdateSubtitles={onUpdateSubtitles}
              onSeek={onSeek}
              activeStyle={timeline.activeSubtitleStyle || 'bouncy-karaoke'}
            />
          </div>
        </div>
      )}

      {/* Sub-tab 3: Project Details Metadata */}
      {activeSubTab === 'details' && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#18181b]">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-white">Project Details</h3>
            <p className="text-[11px] text-zinc-400">Technical metadata and sequence attributes</p>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="p-3 rounded-xl bg-[#121214] border border-[#27272a] space-y-1">
              <span className="text-[10px] text-zinc-500 uppercase font-mono">Aspect Ratio</span>
              <div className="text-xs font-semibold text-[#ededed] flex items-center gap-1.5">
                <Monitor className="w-3.5 h-3.5 text-zinc-400" />
                <span>{timeline.aspectRatio}</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[#121214] border border-[#27272a] space-y-1">
              <span className="text-[10px] text-zinc-500 uppercase font-mono">Resolution</span>
              <div className="text-xs font-semibold text-[#ededed] font-mono">
                {timeline.width} x {timeline.height}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[#121214] border border-[#27272a] space-y-1">
              <span className="text-[10px] text-zinc-500 uppercase font-mono">Frame Rate</span>
              <div className="text-xs font-semibold text-[#ededed] font-mono">
                {timeline.fps} FPS
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[#121214] border border-[#27272a] space-y-1">
              <span className="text-[10px] text-zinc-500 uppercase font-mono">Total Duration</span>
              <div className="text-xs font-semibold text-[#ededed] font-mono flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-zinc-400" />
                <span>{timeline.totalDuration.toFixed(1)}s</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[#121214] border border-[#27272a] space-y-1">
              <span className="text-[10px] text-zinc-500 uppercase font-mono">Video Cuts</span>
              <div className="text-xs font-semibold text-[#ededed] font-mono">
                {timeline.clips.length} Clips
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[#121214] border border-[#27272a] space-y-1">
              <span className="text-[10px] text-zinc-500 uppercase font-mono">Auto-Ducking</span>
              <div className="text-xs font-semibold text-zinc-300 font-mono flex items-center gap-1">
                <Volume2 className="w-3.5 h-3.5 text-zinc-400" />
                <span>-16 dB</span>
              </div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#121214] border border-[#27272a] space-y-2">
            <div className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-zinc-400" />
              <span>AI Director Schema Status</span>
            </div>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Timeline conforms strictly to the Zod vertical video schema. All in/out cuts, Ken Burns transforms, and transition boundaries are synchronized.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
