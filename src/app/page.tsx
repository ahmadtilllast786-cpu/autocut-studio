'use client';

import React, { useState, useEffect } from 'react';
import { MediaAsset, Timeline, AspectRatioType, CaptionPosition, SubtitleStyleType, SubtitleSegment } from '@/types/timeline';
import { SAMPLE_ASSETS, DEFAULT_TIMELINE } from '@/lib/sampleAssets';
import { Navbar } from '@/components/Navbar';
import { MediaBin } from '@/components/media-bin/MediaBin';
import { PromptConsole } from '@/components/prompt-console/PromptConsole';
import { RemotionPreviewPlayer } from '@/components/player/RemotionPreviewPlayer';
import { VisualTimeline } from '@/components/player/VisualTimeline';
import { JsonInspector } from '@/components/player/JsonInspector';
import { SettingsModal, AppSettings } from '@/components/SettingsModal';
import { ExportModal } from '@/components/export/ExportModal';
import { CaptionPresetGallery } from '@/components/captions/CaptionPresetGallery';
import { CaptionEditorDrawer } from '@/components/captions/CaptionEditorDrawer';
import { Wand2, Subtitles, Film } from 'lucide-react';

const DEFAULT_SETTINGS: AppSettings = {
  provider: 'smart-director',
  geminiKey: '',
  geminiModel: 'gemini-2.5-flash',
  openaiKey: '',
  openaiModel: 'gpt-4o-mini',
  whisperKey: '',
  duckingDb: -16,
  exportResolution: '1080x1920',
};

export default function AutoCutStudioPage() {
  const [assets, setAssets] = useState<MediaAsset[]>(SAMPLE_ASSETS);
  const [timeline, setTimeline] = useState<Timeline>({
    ...DEFAULT_TIMELINE,
    aspectRatio: '9:16',
    activeSubtitleStyle: 'capcut-karaoke',
    captionPosition: { x: 50, y: 72 },
  });
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [centerTab, setCenterTab] = useState<'script' | 'captions'>('script');

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);

  // Load saved settings from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('autocut_settings');
      if (saved) {
        setSettings(JSON.parse(saved));
      }
    } catch {
      // Ignore storage errors
    }
  }, []);

  const handleSaveSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    try {
      localStorage.setItem('autocut_settings', JSON.stringify(newSettings));
    } catch {
      // Ignore storage errors
    }
  };

  const handleLoadSampleAssets = () => {
    setAssets(SAMPLE_ASSETS);
    setTimeline({
      ...DEFAULT_TIMELINE,
      aspectRatio: '9:16',
      activeSubtitleStyle: 'capcut-karaoke',
      captionPosition: { x: 50, y: 72 },
    });
    setCurrentTime(0);
  };

  const handleAddAsset = (newAsset: MediaAsset) => {
    setAssets((prev) => [...prev, newAsset]);
  };

  const handleDeleteAsset = (id: string) => {
    setAssets((prev) => prev.filter((a) => a.id !== id));
  };

  const handleTimelineGenerated = (newTimeline: Timeline) => {
    setTimeline({
      ...newTimeline,
      aspectRatio: timeline.aspectRatio || '9:16',
      activeSubtitleStyle: timeline.activeSubtitleStyle || 'capcut-karaoke',
      captionPosition: timeline.captionPosition || { x: 50, y: 72 },
    });
    setCurrentTime(0);
  };

  const handleAspectRatioChange = (ratio: AspectRatioType) => {
    setTimeline((prev) => {
      let w = 1080;
      let h = 1920;
      if (ratio === '16:9') {
        w = 1920;
        h = 1080;
      } else if (ratio === '1:1') {
        w = 1080;
        h = 1080;
      }
      return {
        ...prev,
        aspectRatio: ratio,
        width: w,
        height: h,
      };
    });
  };

  const handleCaptionPositionChange = (pos: CaptionPosition) => {
    setTimeline((prev) => ({
      ...prev,
      captionPosition: pos,
    }));
  };

  const handleSubtitleStyleChange = (style: SubtitleStyleType) => {
    setTimeline((prev) => ({
      ...prev,
      activeSubtitleStyle: style,
      subtitles: prev.subtitles.map((sub) => ({ ...sub, style })),
    }));
  };

  const handleSubtitlesUpdate = (newSubtitles: SubtitleSegment[]) => {
    setTimeline((prev) => ({
      ...prev,
      subtitles: newSubtitles,
    }));
  };

  return (
    <div className="flex flex-col h-screen w-full bg-zinc-950 text-zinc-100 font-sans overflow-hidden">
      {/* Top Navigation */}
      <Navbar
        onLoadSamples={handleLoadSampleAssets}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenExport={() => setIsExportOpen(true)}
        hasClips={timeline.clips.length > 0}
        activeProvider={settings.provider}
        aspectRatio={timeline.aspectRatio}
        activeStyle={timeline.activeSubtitleStyle || 'capcut-karaoke'}
      />

      {/* Main Studio 3-Panel Workspace */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
        {/* Module 1: Media Bin & Asset Tagging (Left Panel: 3 cols) */}
        <section className="lg:col-span-3 border-r border-zinc-800/80 h-full overflow-hidden flex flex-col">
          <MediaBin
            assets={assets}
            onAddAsset={handleAddAsset}
            onDeleteAsset={handleDeleteAsset}
          />
        </section>

        {/* Center Panel (4 cols): Tabbed view between Prompt Console and Captions Studio */}
        <section className="lg:col-span-4 border-r border-zinc-800/80 h-full overflow-hidden flex flex-col bg-zinc-950/40">
          {/* Center Tabs Navigation */}
          <div className="h-12 border-b border-zinc-800/80 px-4 flex items-center justify-between bg-zinc-950/80 flex-shrink-0">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCenterTab('script')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  centerTab === 'script'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                }`}
              >
                <Wand2 className="w-3.5 h-3.5" />
                <span>AI Director & Script</span>
              </button>

              <button
                type="button"
                onClick={() => setCenterTab('captions')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer relative ${
                  centerTab === 'captions'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                }`}
              >
                <Subtitles className="w-3.5 h-3.5 text-yellow-400" />
                <span>Auto-Captions Engine</span>
                <span className="w-2 h-2 rounded-full bg-yellow-400 animate-ping absolute -top-0.5 -right-0.5" />
              </button>
            </div>
          </div>

          {/* Center Tab 1: AI Prompt & Director Console */}
          {centerTab === 'script' && (
            <div className="flex-1 overflow-y-auto">
              <PromptConsole
                assets={assets}
                currentTimeline={timeline}
                onTimelineGenerated={handleTimelineGenerated}
                settings={settings}
              />
            </div>
          )}

          {/* Center Tab 2: Dedicated Dynamic Auto-Captions Engine */}
          {centerTab === 'captions' && (
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Preset Style Gallery (CapCut & Premiere Inspired) */}
              <CaptionPresetGallery
                currentStyle={timeline.activeSubtitleStyle || 'capcut-karaoke'}
                onSelectStyle={handleSubtitleStyleChange}
              />

              {/* Side-by-side Transcript & Word Editor Drawer */}
              <div className="h-[380px]">
                <CaptionEditorDrawer
                  subtitles={timeline.subtitles}
                  currentTime={currentTime}
                  onUpdateSubtitles={handleSubtitlesUpdate}
                  onSeek={setCurrentTime}
                  activeStyle={timeline.activeSubtitleStyle || 'capcut-karaoke'}
                />
              </div>
            </div>
          )}
        </section>

        {/* Module 4: Video Preview & Export (Right Panel: 5 cols) */}
        <section className="lg:col-span-5 h-full overflow-y-auto flex flex-col p-4 gap-4 bg-zinc-950/80">
          {/* Interactive Adaptive Multi-Aspect Ratio Player */}
          <div className="flex-1 flex flex-col min-h-[520px]">
            <RemotionPreviewPlayer
              timeline={timeline}
              assets={assets}
              currentTime={currentTime}
              onTimeUpdate={setCurrentTime}
              onAspectRatioChange={handleAspectRatioChange}
              onCaptionPositionChange={handleCaptionPositionChange}
              onSubtitleStyleChange={handleSubtitleStyleChange}
            />
          </div>

          {/* Multi-track Timeline Visualizer */}
          <div className="w-full">
            <VisualTimeline
              timeline={timeline}
              currentTime={currentTime}
              onSeek={setCurrentTime}
              assets={assets}
            />
          </div>

          {/* JSON Inspector Collapsible Drawer */}
          <div className="w-full pb-4">
            <JsonInspector
              timeline={timeline}
              onUpdateTimeline={setTimeline}
            />
          </div>
        </section>
      </main>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSave={handleSaveSettings}
      />

      {/* Video Export Progress Modal */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        timeline={timeline}
        assets={assets}
        defaultResolution={settings.exportResolution}
      />
    </div>
  );
}
