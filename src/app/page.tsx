'use client';

import React, { useState, useEffect } from 'react';
import {
  MediaAsset,
  Timeline,
  AspectRatioType,
  CaptionPosition,
  SubtitleStyleType,
  SubtitleSegment,
  TimelineClip,
} from '@/types/timeline';
import { SAMPLE_ASSETS, DEFAULT_TIMELINE } from '@/lib/sampleAssets';
import { Navbar } from '@/components/Navbar';
import { SettingsModal, AppSettings } from '@/components/SettingsModal';
import { ExportModal } from '@/components/export/ExportModal';
import { MediaDrawerPanel } from '@/components/docking/panels/MediaDrawerPanel';
import { PlayerViewportPanel } from '@/components/docking/panels/PlayerViewportPanel';
import { InspectorPanel } from '@/components/docking/panels/InspectorPanel';
import { TimelinePanel } from '@/components/docking/panels/TimelinePanel';
import { SelfCodeDiagnostic } from '@/components/diagnostic/SelfCodeDiagnostic';

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
    activeSubtitleStyle: 'bouncy-karaoke',
    captionPosition: { x: 50, y: 70 },
  });
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
    setTimeline({
      ...DEFAULT_TIMELINE,
      aspectRatio: '9:16',
      activeSubtitleStyle: 'bouncy-karaoke',
      captionPosition: { x: 50, y: 70 },
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
      activeSubtitleStyle: timeline.activeSubtitleStyle || 'bouncy-karaoke',
      captionPosition: timeline.captionPosition || { x: 50, y: 70 },
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

  const handleUpdateClips = (clips: TimelineClip[]) => {
    setTimeline((prev) => ({
      ...prev,
      clips,
    }));
  };

  return (
    <div className="grid grid-rows-[52px_1fr_280px] h-screen w-screen bg-[#0d0d0e] text-[#ededed] font-sans overflow-hidden select-none">
      {/* 1. Top Menu Bar (Strict 52px) */}
      <Navbar
        onLoadSamples={handleLoadSampleAssets}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenExport={() => setIsExportOpen(true)}
        hasClips={timeline.clips.length > 0}
        activeProvider={settings.provider}
        aspectRatio={timeline.aspectRatio}
        activeStyle={timeline.activeSubtitleStyle || 'bouncy-karaoke'}
      />

      {/* 2. Middle Row: 3 Non-Overlapping Panels (Main Screen shifted to left) */}
      <main className="grid grid-cols-[360px_1fr_340px] overflow-hidden bg-[#0d0d0e]">
        {/* Left Quadrant: Media & Feature Drawer with Big Upload Option */}
        <div className="overflow-hidden border-r border-[#27272a] bg-[#121214] flex flex-col">
          <MediaDrawerPanel
            assets={assets}
            onAddAsset={handleAddAsset}
            onDeleteAsset={handleDeleteAsset}
            onLoadSamples={handleLoadSampleAssets}
          />
        </div>

        {/* Center Quadrant: Player Viewport (Main Screen shifted toward left side) */}
        <div className="overflow-hidden bg-[#0d0d0e] flex flex-col items-center justify-center lg:items-start lg:pl-8 p-2 relative">
          <PlayerViewportPanel
            timeline={timeline}
            assets={assets}
            currentTime={currentTime}
            onTimeUpdate={setCurrentTime}
            onAspectRatioChange={handleAspectRatioChange}
            onCaptionPositionChange={handleCaptionPositionChange}
            onSubtitleStyleChange={handleSubtitleStyleChange}
          />
        </div>

        {/* Right Quadrant: Inspector & AI Director */}
        <div className="overflow-hidden border-l border-[#27272a] bg-[#121214] flex flex-col">
          <InspectorPanel
            timeline={timeline}
            assets={assets}
            currentTime={currentTime}
            onTimelineGenerated={handleTimelineGenerated}
            onUpdateSubtitles={handleSubtitlesUpdate}
            onSeek={setCurrentTime}
            onSubtitleStyleChange={handleSubtitleStyleChange}
            settings={settings}
          />
        </div>
      </main>

      {/* 3. Bottom Row: Multi-Track Timeline (Strict 280px) */}
      <footer className="h-[280px] overflow-hidden border-t border-[#27272a] bg-[#121214]">
        <TimelinePanel
          timeline={timeline}
          assets={assets}
          currentTime={currentTime}
          onSeek={setCurrentTime}
          onUpdateClips={handleUpdateClips}
        />
      </footer>

      {/* 4. Self-Code Feature Analyzer Diagnostic Badge & Crawler */}
      <SelfCodeDiagnostic
        timeline={timeline}
        assets={assets}
        settings={settings}
        currentTime={currentTime}
      />

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
