'use client';

import React from 'react';
import { Timeline, MediaAsset, AspectRatioType, CaptionPosition, SubtitleStyleType } from '@/types/timeline';
import { RemotionPreviewPlayer } from '@/components/player/RemotionPreviewPlayer';

interface PlayerViewportPanelProps {
  timeline: Timeline;
  assets: MediaAsset[];
  currentTime: number;
  onTimeUpdate: React.Dispatch<React.SetStateAction<number>>;
  onAspectRatioChange: (ratio: AspectRatioType) => void;
  onCaptionPositionChange: (pos: CaptionPosition) => void;
  onSubtitleStyleChange: (style: SubtitleStyleType) => void;
}

export function PlayerViewportPanel({
  timeline,
  assets,
  currentTime,
  onTimeUpdate,
  onAspectRatioChange,
  onCaptionPositionChange,
  onSubtitleStyleChange,
}: PlayerViewportPanelProps) {
  return (
    <div className="flex flex-col h-full w-full bg-[#121214] overflow-hidden select-none">
      <div className="flex-1 w-full h-full flex flex-col p-2 overflow-hidden">
        <RemotionPreviewPlayer
          timeline={timeline}
          assets={assets}
          currentTime={currentTime}
          onTimeUpdate={onTimeUpdate}
          onAspectRatioChange={onAspectRatioChange}
          onCaptionPositionChange={onCaptionPositionChange}
          onSubtitleStyleChange={onSubtitleStyleChange}
        />
      </div>
    </div>
  );
}
