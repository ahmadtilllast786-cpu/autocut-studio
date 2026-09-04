'use client';

import React, { useState, useEffect } from 'react';
import { MediaAsset, Timeline } from '@/types/timeline';
import { SAMPLE_ASSETS, DEFAULT_TIMELINE } from '@/lib/sampleAssets';
import { Navbar } from '@/components/Navbar';
import { MediaBin } from '@/components/media-bin/MediaBin';
import { PromptConsole } from '@/components/prompt-console/PromptConsole';
import { RemotionPreviewPlayer } from '@/components/player/RemotionPreviewPlayer';
import { VisualTimeline } from '@/components/player/VisualTimeline';
import { JsonInspector } from '@/components/player/JsonInspector';
import { SettingsModal, AppSettings } from '@/components/SettingsModal';
import { ExportModal } from '@/components/export/ExportModal';

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
  const [timeline, setTimeline] = useState<Timeline>(DEFAULT_TIMELINE);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

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
    setTimeline(DEFAULT_TIMELINE);
    setCurrentTime(0);
  };

  const handleAddAsset = (newAsset: MediaAsset) => {
    setAssets((prev) => [...prev, newAsset]);
  };

  const handleDeleteAsset = (id: string) => {
    setAssets((prev) => prev.filter((a) => a.id !== id));
  };

  const handleTimelineGenerated = (newTimeline: Timeline) => {
    setTimeline(newTimeline);
    setCurrentTime(0);
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

        {/* Module 2: Prompt & Instruction Console (Center Panel: 4 cols) */}
        <section className="lg:col-span-4 border-r border-zinc-800/80 h-full overflow-hidden flex flex-col">
          <PromptConsole
            assets={assets}
            currentTimeline={timeline}
            onTimelineGenerated={handleTimelineGenerated}
            settings={settings}
          />
        </section>

        {/* Module 4: Video Preview & Export (Right Panel: 5 cols) */}
        <section className="lg:col-span-5 h-full overflow-y-auto flex flex-col p-4 gap-4 bg-zinc-950/80">
          {/* 9:16 Interactive Remotion Video Player */}
          <div className="flex-1 flex flex-col min-h-[520px]">
            <RemotionPreviewPlayer
              timeline={timeline}
              assets={assets}
              currentTime={currentTime}
              onTimeUpdate={setCurrentTime}
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
