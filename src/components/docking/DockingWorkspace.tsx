'use client';

import React, { useRef, useCallback, useEffect } from 'react';
import {
  DockviewReact,
  DockviewReadyEvent,
  IDockviewPanelProps,
  DockviewApi,
} from 'dockview-react';
import { Timeline, MediaAsset, AspectRatioType, CaptionPosition, SubtitleStyleType, SubtitleSegment, TimelineClip } from '@/types/timeline';
import { AppSettings } from '@/components/SettingsModal';
import { MediaDrawerPanel } from './panels/MediaDrawerPanel';
import { PlayerViewportPanel } from './panels/PlayerViewportPanel';
import { InspectorPanel } from './panels/InspectorPanel';
import { TimelinePanel } from './panels/TimelinePanel';

interface DockingWorkspaceProps {
  timeline: Timeline;
  assets: MediaAsset[];
  currentTime: number;
  settings: AppSettings;
  onTimeUpdate: React.Dispatch<React.SetStateAction<number>>;
  onSeek: (time: number) => void;
  onAddAsset: (asset: MediaAsset) => void;
  onDeleteAsset: (id: string) => void;
  onLoadSamples: () => void;
  onTimelineGenerated: (timeline: Timeline) => void;
  onAspectRatioChange: (ratio: AspectRatioType) => void;
  onCaptionPositionChange: (pos: CaptionPosition) => void;
  onSubtitleStyleChange: (style: SubtitleStyleType) => void;
  onUpdateSubtitles: (subs: SubtitleSegment[]) => void;
  onUpdateClips: (clips: TimelineClip[]) => void;
  onRegisterResetLayout?: (resetFn: () => void) => void;
}

const STORAGE_KEY = 'autocut_dockview_layout_v2';

export function DockingWorkspace({
  timeline,
  assets,
  currentTime,
  settings,
  onTimeUpdate,
  onSeek,
  onAddAsset,
  onDeleteAsset,
  onLoadSamples,
  onTimelineGenerated,
  onAspectRatioChange,
  onCaptionPositionChange,
  onSubtitleStyleChange,
  onUpdateSubtitles,
  onUpdateClips,
  onRegisterResetLayout,
}: DockingWorkspaceProps) {
  const apiRef = useRef<DockviewApi | null>(null);

  const initDefaultLayout = useCallback((api: DockviewApi) => {
    api.clear();

    // 1. Panel A: Media & Feature Drawer (Top-Left)
    api.addPanel({
      id: 'mediaDrawer',
      component: 'mediaDrawer',
      title: 'Media & Features',
      initialWidth: 360,
    });

    // 2. Panel B: Video Player Viewport (Top-Center)
    api.addPanel({
      id: 'playerViewport',
      component: 'playerViewport',
      title: 'Player Viewport',
      position: { referencePanel: 'mediaDrawer', direction: 'right' },
      initialWidth: 540,
    });

    // 3. Panel C: Details & AI Director Inspector (Top-Right)
    api.addPanel({
      id: 'inspector',
      component: 'inspector',
      title: 'Inspector & AI Director',
      position: { referencePanel: 'playerViewport', direction: 'right' },
      initialWidth: 400,
    });

    // 4. Panel D: Multi-Track Timeline (Bottom Full-Width)
    api.addPanel({
      id: 'timeline',
      component: 'timeline',
      title: 'Multi-Track Timeline',
      position: { direction: 'below' },
      initialHeight: 280,
    });
  }, []);

  const resetLayout = useCallback(() => {
    if (!apiRef.current) return;
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
    initDefaultLayout(apiRef.current);
  }, [initDefaultLayout]);

  useEffect(() => {
    onRegisterResetLayout?.(resetLayout);
  }, [onRegisterResetLayout, resetLayout]);

  const onReady = useCallback(
    (event: DockviewReadyEvent) => {
      apiRef.current = event.api;

      // Register layout change listener for localStorage persistence
      event.api.onDidLayoutChange(() => {
        try {
          const layoutJson = event.api.toJSON();
          localStorage.setItem(STORAGE_KEY, JSON.stringify(layoutJson));
        } catch {}
      });

      // Try restoring from localStorage
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && typeof parsed === 'object') {
            event.api.fromJSON(parsed);
            return;
          }
        }
      } catch (err) {
        console.warn('Could not restore saved dock layout, using default:', err);
      }

      initDefaultLayout(event.api);
    },
    [initDefaultLayout]
  );

  // Component renderers for Dockview
  const components = {
    mediaDrawer: (_props: IDockviewPanelProps) => (
      <MediaDrawerPanel
        assets={assets}
        onAddAsset={onAddAsset}
        onDeleteAsset={onDeleteAsset}
        onLoadSamples={onLoadSamples}
        onInsertTag={(tag) => {
          // If prompt console or inspector needs tag insertion
        }}
      />
    ),
    playerViewport: (_props: IDockviewPanelProps) => (
      <PlayerViewportPanel
        timeline={timeline}
        assets={assets}
        currentTime={currentTime}
        onTimeUpdate={onTimeUpdate}
        onAspectRatioChange={onAspectRatioChange}
        onCaptionPositionChange={onCaptionPositionChange}
        onSubtitleStyleChange={onSubtitleStyleChange}
      />
    ),
    inspector: (_props: IDockviewPanelProps) => (
      <InspectorPanel
        timeline={timeline}
        assets={assets}
        currentTime={currentTime}
        onTimelineGenerated={onTimelineGenerated}
        onUpdateSubtitles={onUpdateSubtitles}
        onSeek={onSeek}
        onSubtitleStyleChange={onSubtitleStyleChange}
        settings={settings}
      />
    ),
    timeline: (_props: IDockviewPanelProps) => (
      <TimelinePanel
        timeline={timeline}
        assets={assets}
        currentTime={currentTime}
        onSeek={onSeek}
        onUpdateClips={onUpdateClips}
      />
    ),
  };

  return (
    <div className="w-full h-full bg-[#121214] overflow-hidden relative">
      <DockviewReact
        components={components}
        onReady={onReady}
        className="dockview-theme-dark w-full h-full"
      />
    </div>
  );
}
