'use client';

import React, { useState, useEffect, useRef } from 'react';
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
import { DockingWorkspace } from '@/components/docking/DockingWorkspace';

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
  const resetLayoutFnRef = useRef<(() => void) | null>(null);

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
    <div className="flex flex-col h-screen w-full bg-[#121214] text-zinc-100 font-sans overflow-hidden">
      {/* Top Menu Bar */}
      <Navbar
        onLoadSamples={handleLoadSampleAssets}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenExport={() => setIsExportOpen(true)}
        onResetLayout={() => resetLayoutFnRef.current?.()}
        hasClips={timeline.clips.length > 0}
        activeProvider={settings.provider}
        aspectRatio={timeline.aspectRatio}
        activeStyle={timeline.activeSubtitleStyle || 'capcut-karaoke'}
      />

      {/* Dockable, Resizable, and Shuffleable Desktop Workspace */}
      <main className="flex-1 w-full overflow-hidden relative">
        <DockingWorkspace
          timeline={timeline}
          assets={assets}
          currentTime={currentTime}
          settings={settings}
          onTimeUpdate={setCurrentTime}
          onSeek={setCurrentTime}
          onAddAsset={handleAddAsset}
          onDeleteAsset={handleDeleteAsset}
          onLoadSamples={handleLoadSampleAssets}
          onTimelineGenerated={handleTimelineGenerated}
          onAspectRatioChange={handleAspectRatioChange}
          onCaptionPositionChange={handleCaptionPositionChange}
          onSubtitleStyleChange={handleSubtitleStyleChange}
          onUpdateSubtitles={handleSubtitlesUpdate}
          onUpdateClips={handleUpdateClips}
          onRegisterResetLayout={(fn) => {
            resetLayoutFnRef.current = fn;
          }}
        />
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
