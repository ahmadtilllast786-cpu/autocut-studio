'use client';

import React, { useState, useRef, useMemo } from 'react';
import { Timeline, MediaAsset, TimelineClip, TimelineTrack } from '@/types/timeline';
import { extractSpeechIntervals } from '@/lib/audioEngine';
import {
  Scissors,
  Magnet,
  Layers,
  Mic,
  ZoomIn,
  ZoomOut,
  Film,
  Music,
  Subtitles,
  Plus,
  Shuffle,
  Trash2,
  X,
  GripHorizontal,
  Eye,
  Lock,
  Volume2,
} from 'lucide-react';

interface TimelinePanelProps {
  timeline: Timeline;
  assets: MediaAsset[];
  currentTime: number;
  onSeek: (time: number) => void;
  onUpdateClips?: (clips: TimelineClip[]) => void;
}

const INITIAL_TRACKS: TimelineTrack[] = [
  // Above Lines (Overlay & B-Items)
  { id: 'overlay_1', label: 'B-Roll / Overlay 1', type: 'overlay-broll', position: 'above' },
  { id: 'overlay_2', label: 'B-Roll / Overlay 2', type: 'overlay-broll', position: 'above' },
  { id: 'captions', label: 'Dynamic Captions', type: 'captions', position: 'above' },
  // Center Straight-Line Video & Photo Track
  { id: 'main', label: 'Main Sequence (Videos & Pics)', type: 'video-main', position: 'main' },
  // Below Lines (Audio Stems & Tracks)
  { id: 'audio_vo', label: 'VO_TRACK (Voiceover)', type: 'audio-vo', position: 'below' },
  { id: 'audio_bgm', label: 'BG_MUSIC (Ducked -16dB)', type: 'audio-bgm', position: 'below' },
  { id: 'audio_sfx', label: 'Audio Line 3 (SFX / Stems)', type: 'audio-sfx', position: 'below' },
];

export function TimelinePanel({
  timeline,
  assets,
  currentTime,
  onSeek,
  onUpdateClips,
}: TimelinePanelProps) {
  const [tracks, setTracks] = useState<TimelineTrack[]>(INITIAL_TRACKS);
  const [zoomLevel, setZoomLevel] = useState<number>(1.0); // 0.8x to 2.0x
  const [magnetSnapping, setMagnetSnapping] = useState<boolean>(true);
  const [rippleEdit, setRippleEdit] = useState<boolean>(true);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [draggingClipId, setDraggingClipId] = useState<string | null>(null);
  const [dropGhost, setDropGhost] = useState<{ trackId: string; timeSec: number; percent: number } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const totalDuration = timeline.totalDuration || 60;
  const speechIntervals = extractSpeechIntervals(timeline.subtitles);

  // Asset lookup map
  const assetMap = useMemo(() => {
    const map = new Map<string, MediaAsset>();
    assets.forEach((a) => map.set(a.id, a));
    return map;
  }, [assets]);

  // Main track clips (straight line video & pictures)
  const mainClips = useMemo(() => {
    return timeline.clips
      .filter((c) => !c.trackId || c.trackId === 'main')
      .sort((a, b) => a.startTime - b.startTime);
  }, [timeline.clips]);

  // Add line above (up to 5 lines above)
  const handleAddLineAbove = () => {
    const aboveCount = tracks.filter((t) => t.position === 'above' && t.type === 'overlay-broll').length;
    if (aboveCount >= 5) return;
    const newId = `overlay_${Date.now()}`;
    const newTrack: TimelineTrack = {
      id: newId,
      label: `B-Roll / Overlay ${aboveCount + 1}`,
      type: 'overlay-broll',
      position: 'above',
      isCustom: true,
    };
    setTracks((prev) => [newTrack, ...prev]);
  };

  // Add line below (up to 5 lines below)
  const handleAddLineBelow = () => {
    const belowCount = tracks.filter((t) => t.position === 'below').length;
    if (belowCount >= 6) return;
    const newId = `audio_${Date.now()}`;
    const newTrack: TimelineTrack = {
      id: newId,
      label: `Audio Line ${belowCount + 1} (Stem/SFX)`,
      type: 'audio-sfx',
      position: 'below',
      isCustom: true,
    };
    setTracks((prev) => [...prev, newTrack]);
  };

  // Delete custom line
  const handleDeleteTrack = (trackId: string) => {
    setTracks((prev) => prev.filter((t) => t.id !== trackId));
    onUpdateClips?.(timeline.clips.filter((c) => c.trackId !== trackId));
  };

  // 🔀 Shuffle the Straight Main Video & Picture sequence
  const handleShuffleMain = () => {
    const otherClips = timeline.clips.filter((c) => c.trackId && c.trackId !== 'main');
    const clipsToShuffle = [...mainClips];
    if (clipsToShuffle.length <= 1) return;

    // Fisher-Yates shuffle
    for (let i = clipsToShuffle.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [clipsToShuffle[i], clipsToShuffle[j]] = [clipsToShuffle[j], clipsToShuffle[i]];
    }

    // Recalculate contiguous linear start times on straight line
    let curTime = 0;
    const resequenced = clipsToShuffle.map((c) => {
      const updated = { ...c, startTime: Number(curTime.toFixed(2)), trackId: 'main' };
      curTime += c.duration;
      return updated;
    });

    onUpdateClips?.([...resequenced, ...otherClips]);
  };

  // Main clip drag-to-shuffle reorder
  const handleClipDragStart = (e: React.DragEvent, clipId: string) => {
    e.stopPropagation();
    setDraggingClipId(clipId);
    e.dataTransfer.setData('text/plain', clipId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleClipDropOnClip = (e: React.DragEvent, targetClipId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!draggingClipId || draggingClipId === targetClipId) return;

    const otherClips = timeline.clips.filter((c) => c.trackId && c.trackId !== 'main');
    const list = [...mainClips];

    const fromIdx = list.findIndex((c) => c.id === draggingClipId);
    const toIdx = list.findIndex((c) => c.id === targetClipId);
    if (fromIdx === -1 || toIdx === -1) return;

    // Swap / Move clip to new slot
    const [moved] = list.splice(fromIdx, 1);
    list.splice(toIdx, 0, moved);

    // Recompute contiguous timing along the straight line
    let curTime = 0;
    const resequenced = list.map((c) => {
      const updated = { ...c, startTime: Number(curTime.toFixed(2)), trackId: 'main' };
      curTime += c.duration;
      return updated;
    });

    onUpdateClips?.([...resequenced, ...otherClips]);
    setDraggingClipId(null);
  };

  // Drag over any track line ("put where we want")
  const handleTrackDragOver = (e: React.DragEvent<HTMLDivElement>, trackId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const timeSec = Number(((clickX / rect.width) * totalDuration).toFixed(2));
    const percent = Math.max(0, Math.min(100, (clickX / rect.width) * 100));

    setDropGhost({ trackId, timeSec, percent });
  };

  const handleTrackDragLeave = () => {
    setDropGhost(null);
  };

  // Drop asset onto any track line at exact cursor timestamp
  const handleTrackDrop = (e: React.DragEvent<HTMLDivElement>, trackId: string) => {
    e.preventDefault();
    setDropGhost(null);

    const jsonStr = e.dataTransfer.getData('application/json');
    if (!jsonStr) return;

    try {
      const data = JSON.parse(jsonStr) as { assetId: string; type: string; duration: number; name: string };
      const rect = e.currentTarget.getBoundingClientRect();
      const clickX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
      const dropTime = Number(((clickX / rect.width) * totalDuration).toFixed(2));
      const clipDuration = Number(Math.min(data.duration || 3.0, 6.0).toFixed(2));

      const newClip: TimelineClip = {
        id: `clip_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        assetId: data.assetId,
        startTime: dropTime,
        duration: clipDuration,
        sourceStart: 0,
        transition: 'punch_in',
        motionEffect: 'ken_burns_zoom',
        colorFilter: 'none',
        trackId,
      };

      if (trackId === 'main') {
        // Insert into straight line sequence and re-flow contiguously
        const otherClips = timeline.clips.filter((c) => c.trackId && c.trackId !== 'main');
        let insertIdx = mainClips.findIndex((c) => c.startTime > dropTime);
        if (insertIdx === -1) insertIdx = mainClips.length;

        const updatedMain = [...mainClips];
        updatedMain.splice(insertIdx, 0, newClip);

        let cur = 0;
        const resequenced = updatedMain.map((c) => {
          const u = { ...c, startTime: Number(cur.toFixed(2)), trackId: 'main' };
          cur += c.duration;
          return u;
        });

        onUpdateClips?.([...resequenced, ...otherClips]);
      } else {
        // B-Roll / Overlay or Audio Track: place exactly at dropTime ("put where we want")
        onUpdateClips?.([...timeline.clips, newClip]);
      }
    } catch (err) {
      console.error('Failed to parse dropped asset data:', err);
    }
  };

  // Delete a clip from any track
  const handleDeleteClip = (e: React.MouseEvent, clipId: string) => {
    e.stopPropagation();
    const remaining = timeline.clips.filter((c) => c.id !== clipId);

    // If deleting from main track, re-flow contiguous timing
    const remainingMain = remaining.filter((c) => !c.trackId || c.trackId === 'main');
    const remainingOthers = remaining.filter((c) => c.trackId && c.trackId !== 'main');

    let cur = 0;
    const resequenced = remainingMain.map((c) => {
      const u = { ...c, startTime: Number(cur.toFixed(2)), trackId: 'main' };
      cur += c.duration;
      return u;
    });

    onUpdateClips?.([...resequenced, ...remainingOthers]);
  };

  // Split specific B-roll or audio clip at playhead position
  const handleSplitClip = (targetClip: TimelineClip) => {
    if (currentTime <= targetClip.startTime || currentTime >= targetClip.startTime + targetClip.duration) return;

    const firstDuration = Number((currentTime - targetClip.startTime).toFixed(2));
    const secondDuration = Number((targetClip.duration - firstDuration).toFixed(2));

    if (firstDuration < 0.2 || secondDuration < 0.2) return;

    const clip1: TimelineClip = {
      ...targetClip,
      id: `${targetClip.id}_cut1_${Date.now().toString(36).slice(-4)}`,
      duration: firstDuration,
    };

    const clip2: TimelineClip = {
      ...targetClip,
      id: `${targetClip.id}_cut2_${Date.now().toString(36).slice(-4)}`,
      startTime: Number(currentTime.toFixed(2)),
      duration: secondDuration,
      sourceStart: Number((targetClip.sourceStart + firstDuration).toFixed(2)),
      transition: 'none',
    };

    const remaining = timeline.clips.filter((c) => c.id !== targetClip.id);
    onUpdateClips?.([...remaining, clip1, clip2]);
  };

  // Blade tool: cuts B-roll item (above) or sound tracks (below) at playhead
  const handleBladeSplit = () => {
    // 1. Look for B-roll / overlay clip under playhead first
    let target = timeline.clips.find(
      (c) => c.trackId?.startsWith('overlay') && currentTime > c.startTime && currentTime < c.startTime + c.duration
    );

    // 2. Look for audio stem clip under playhead next
    if (!target) {
      target = timeline.clips.find(
        (c) => c.trackId?.startsWith('audio') && currentTime > c.startTime && currentTime < c.startTime + c.duration
      );
    }

    // 3. Fallback: split main clip contiguously if explicitly requested
    if (!target) {
      target = timeline.clips.find(
        (c) => currentTime > c.startTime && currentTime < c.startTime + c.duration
      );
    }

    if (target) {
      handleSplitClip(target);
    }
  };

  // Wheel zoom with Ctrl / Cmd / Alt keys
  const handleCanvasWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey || e.altKey) {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 0.3 : -0.3;
      setZoomLevel((prev) => Math.max(1.0, Math.min(6.0, Number((prev + delta).toFixed(2)))));
    }
  };

  // Scrub playhead on pointer down
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clickX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    let newTime = (clickX / rect.width) * totalDuration;

    if (magnetSnapping) {
      for (const clip of timeline.clips) {
        if (Math.abs(newTime - clip.startTime) < 0.6) {
          newTime = clip.startTime;
          break;
        }
        if (Math.abs(newTime - (clip.startTime + clip.duration)) < 0.6) {
          newTime = clip.startTime + clip.duration;
          break;
        }
      }
    }

    onSeek(Number(newTime.toFixed(2)));

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const moveX = Math.max(0, Math.min(moveEvent.clientX - rect.left, rect.width));
      let seekTime = (moveX / rect.width) * totalDuration;

      if (magnetSnapping) {
        for (const clip of timeline.clips) {
          if (Math.abs(seekTime - clip.startTime) < 0.6) {
            seekTime = clip.startTime;
            break;
          }
          if (Math.abs(seekTime - (clip.startTime + clip.duration)) < 0.6) {
            seekTime = clip.startTime + clip.duration;
            break;
          }
        }
      }

      onSeek(Number(seekTime.toFixed(2)));
    };

    const handlePointerUp = () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  const playheadPercent = Math.min(100, (currentTime / totalDuration) * 100);

  // Dynamic adaptive time ruler ticks based on zoom level (1s, 2s, or 5s)
  const tickStep = zoomLevel >= 4.0 ? 1 : zoomLevel >= 2.0 ? 2 : 5;
  const rulerTicks: number[] = [];
  for (let s = 0; s <= totalDuration; s += tickStep) {
    rulerTicks.push(s);
  }

  const getTransitionBadge = (trans: string) => {
    switch (trans) {
      case 'punch_in':
        return '🥊 Punch In';
      case 'whip_pan':
      case 'whip-pan':
        return '⚡ Whip';
      case 'ken_burns_zoom':
        return '🔍 Zoom';
      case 'white_flash':
        return '✨ Flash';
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#121214] text-zinc-200 select-none overflow-hidden font-sans">
      {/* ========================================================================= */}
      {/* 1. TIMELINE CONTROLS TOOLBAR                                              */}
      {/* ========================================================================= */}
      <div className="h-10 border-b border-[#27272a] bg-[#121214] px-3 flex items-center justify-between gap-2 flex-shrink-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Blade Split Tool */}
          <button
            type="button"
            onClick={handleBladeSplit}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#18181b] hover:bg-[#27272a] text-zinc-300 text-xs font-medium border border-[#27272a] hover:border-zinc-500 transition cursor-pointer"
            title="Blade Tool: Split clip at playhead position"
          >
            <Scissors className="w-3.5 h-3.5 text-zinc-400" />
            <span className="hidden sm:inline">Split</span>
          </button>

          {/* 🔀 SHUFFLE SEQUENCE BUTTON */}
          <button
            type="button"
            onClick={handleShuffleMain}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#18181b] hover:bg-[#27272a] text-zinc-200 text-xs font-semibold border border-[#27272a] hover:border-zinc-400 transition cursor-pointer"
            title="Shuffle Straight Line: Reorder videos and photos sequence"
          >
            <Shuffle className="w-3.5 h-3.5 text-zinc-300" />
            <span>Shuffle Main</span>
          </button>

          {/* + ADD LINE ABOVE BUTTON */}
          <button
            type="button"
            onClick={handleAddLineAbove}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#18181b] hover:bg-[#27272a] text-zinc-300 text-xs font-medium border border-[#27272a] hover:border-zinc-500 transition cursor-pointer"
            title="Add a new B-Roll / Overlay line above the main track (up to 5 lines)"
          >
            <Plus className="w-3.5 h-3.5 text-zinc-400" />
            <span className="hidden sm:inline">Add Line Above</span>
            <span className="sm:hidden">+ Above</span>
          </button>

          {/* + ADD LINE BELOW BUTTON */}
          <button
            type="button"
            onClick={handleAddLineBelow}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#18181b] hover:bg-[#27272a] text-zinc-300 text-xs font-medium border border-[#27272a] hover:border-zinc-500 transition cursor-pointer"
            title="Add a new Audio / Stem line below the main track (up to 5 lines)"
          >
            <Plus className="w-3.5 h-3.5 text-zinc-400" />
            <span className="hidden sm:inline">Add Line Below</span>
            <span className="sm:hidden">+ Below</span>
          </button>

          {/* Ripple Edit Toggle */}
          <button
            type="button"
            onClick={() => setRippleEdit(!rippleEdit)}
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium border transition cursor-pointer ${
              rippleEdit
                ? 'bg-[#27272a] border-zinc-500 text-[#ededed]'
                : 'bg-[#18181b] border-[#27272a] text-zinc-400 hover:text-white'
            }`}
            title="Ripple Edit Mode"
          >
            <Layers className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Ripple</span>
          </button>

          {/* Magnet Snapping Toggle */}
          <button
            type="button"
            onClick={() => setMagnetSnapping(!magnetSnapping)}
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium border transition cursor-pointer ${
              magnetSnapping
                ? 'bg-[#27272a] border-zinc-500 text-[#ededed]'
                : 'bg-[#18181b] border-[#27272a] text-zinc-400 hover:text-white'
            }`}
            title="Magnet Snapping"
          >
            <Magnet className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Snap</span>
          </button>

          {/* Record Voiceover Toggle */}
          <button
            type="button"
            onClick={() => setIsRecording(!isRecording)}
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium border transition cursor-pointer ${
              isRecording
                ? 'bg-zinc-800 border-zinc-500 text-zinc-200'
                : 'bg-[#18181b] border-[#27272a] text-zinc-400 hover:text-white'
            }`}
            title="Record Voiceover"
          >
            <Mic className="w-3.5 h-3.5 text-zinc-400" />
            <span className="hidden md:inline">Record</span>
          </button>
        </div>

        {/* Timecode & High-Precision Zoom Controls */}
        <div className="flex items-center gap-3">
          <div className="font-mono text-xs font-medium text-zinc-200">
            <span className="text-[#ededed] font-semibold">{formatTime(currentTime)}</span>
            <span className="text-zinc-600 mx-1">/</span>
            <span className="text-zinc-500">{formatTime(totalDuration)}</span>
          </div>

          <div className="flex items-center gap-1.5 bg-[#18181b] px-2 py-1 rounded-lg border border-[#27272a]">
            <button
              type="button"
              onClick={() => setZoomLevel((prev) => Math.max(1.0, Number((prev - 0.5).toFixed(1))))}
              className="p-1 rounded text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
              title="Zoom Out (-)"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <input
              type="range"
              min={1.0}
              max={6.0}
              step={0.25}
              value={zoomLevel}
              onChange={(e) => setZoomLevel(Number(e.target.value))}
              className="w-20 accent-white bg-[#27272a] h-1.5 rounded cursor-pointer"
              title="Smooth Zoom (100% to 600%)"
            />
            <button
              type="button"
              onClick={() => setZoomLevel((prev) => Math.min(6.0, Number((prev + 0.5).toFixed(1))))}
              className="p-1 rounded text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
              title="Zoom In (+)"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <span className="font-mono text-[10px] text-zinc-400 min-w-[34px] text-right">
              {Math.round(zoomLevel * 100)}%
            </span>
            {zoomLevel > 1.05 && (
              <button
                type="button"
                onClick={() => setZoomLevel(1.0)}
                className="ml-1 px-1.5 py-0.5 rounded text-[9px] font-mono bg-zinc-800 text-zinc-200 hover:text-white border border-[#3f3f46] transition cursor-pointer"
                title="Reset Zoom (Fit to Screen)"
              >
                Fit
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. MULTI-TRACK TIMELINE VIEWPORT (TRACK HEADERS + SCROLLABLE CANVAS)       */}
      {/* ========================================================================= */}
      <div className="flex-1 flex overflow-hidden bg-[#18181b]">
        {/* Track Headers Column (Pinned Left) */}
        <div className="w-48 border-r border-[#27272a] bg-[#121214] flex flex-col flex-shrink-0 overflow-y-hidden select-none">
          {/* Header spacer aligned with ruler */}
          <div className="h-6 border-b border-[#27272a] px-3 flex items-center justify-between text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
            <span>Tracks ({tracks.length})</span>
            <span className="text-[9px] text-zinc-600">Drag Target</span>
          </div>

          {/* Track Headers List */}
          <div className="flex-1 flex flex-col overflow-y-auto no-scrollbar gap-1.5 p-1.5">
            {tracks.map((track) => {
              const isMain = track.id === 'main';
              const isCaptions = track.id === 'captions';
              const isOverlay = track.type === 'overlay-broll';
              const isAudio = track.position === 'below';

              return (
                <div
                  key={track.id}
                  className={`px-2 py-1 rounded-lg border flex items-center justify-between text-xs transition ${
                    isMain
                      ? 'h-14 bg-[#18181b] border-zinc-500/50 shadow-xs'
                      : isCaptions
                      ? 'h-7 bg-[#121214] border-[#27272a]'
                      : 'h-8 bg-[#121214] border-[#27272a]'
                  }`}
                >
                  <div className="flex items-center gap-1.5 truncate">
                    {isMain ? (
                      <Film className="w-3.5 h-3.5 text-zinc-200 flex-shrink-0" />
                    ) : isCaptions ? (
                      <Subtitles className="w-3 h-3 text-zinc-400 flex-shrink-0" />
                    ) : isOverlay ? (
                      <Layers className="w-3 h-3 text-zinc-400 flex-shrink-0" />
                    ) : (
                      <Music className="w-3 h-3 text-zinc-400 flex-shrink-0" />
                    )}
                    <span
                      className={`text-[11px] truncate ${
                        isMain ? 'font-bold text-[#ededed]' : 'font-medium text-zinc-300'
                      }`}
                      title={track.label}
                    >
                      {track.label}
                    </span>
                  </div>

                  {/* Actions (Delete for custom lines, quick shuffle for main) */}
                  <div className="flex items-center gap-1">
                    {isMain && (
                      <button
                        type="button"
                        onClick={handleShuffleMain}
                        className="p-1 rounded text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
                        title="Shuffle Main Sequence"
                      >
                        <Shuffle className="w-3 h-3" />
                      </button>
                    )}

                    {track.isCustom && (
                      <button
                        type="button"
                        onClick={() => handleDeleteTrack(track.id)}
                        className="p-1 rounded text-zinc-500 hover:text-red-400 hover:bg-zinc-800 transition cursor-pointer"
                        title="Delete this custom track line"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Track Canvas Column (Scrollable Right with Smooth Wheel Zoom) */}
        <div
          onWheel={handleCanvasWheel}
          className="flex-1 overflow-x-auto overflow-y-auto p-1.5 bg-[#18181b] select-none"
        >
          <div
            ref={containerRef}
            onPointerDown={handlePointerDown}
            style={{ width: `${Math.max(100, zoomLevel * 100)}%` }}
            className="relative bg-[#121214] rounded-xl p-2 cursor-pointer border border-[#27272a] hover:border-[#3f3f46] transition-all flex flex-col gap-1.5 shadow-inner"
          >
            {/* Time Ruler (0s to totalDuration) with Dynamic Adaptive Ticks */}
            <div className="relative h-6 border-b border-[#27272a] mb-1 flex items-center">
              {rulerTicks.map((sec) => {
                const leftPct = (sec / totalDuration) * 100;
                const isMajor = sec % 5 === 0 || tickStep === 1;
                return (
                  <div
                    key={sec}
                    className="absolute flex flex-col items-center -translate-x-1/2 pointer-events-none"
                    style={{ left: `${leftPct}%` }}
                  >
                    {isMajor && (
                      <span className="text-[9px] font-mono text-zinc-400 select-none">
                        {sec}s
                      </span>
                    )}
                    <div
                      className={`w-px mt-0.5 ${
                        sec % 5 === 0 ? 'h-2 bg-zinc-400' : 'h-1 bg-zinc-600'
                      }`}
                    />
                  </div>
                );
              })}
            </div>

            {/* Render Each Track Row */}
            {tracks.map((track) => {
              const isMain = track.id === 'main';
              const isCaptions = track.id === 'captions';
              const isGhostActive = dropGhost?.trackId === track.id;

              // Clips belonging to this track
              const trackClips = isMain
                ? mainClips
                : timeline.clips.filter((c) => c.trackId === track.id);

              return (
                <div
                  key={track.id}
                  onDragOver={(e) => handleTrackDragOver(e, track.id)}
                  onDragLeave={handleTrackDragLeave}
                  onDrop={(e) => handleTrackDrop(e, track.id)}
                  className={`relative rounded-md flex items-center transition border ${
                    isMain
                      ? 'h-14 bg-[#0d0d0e] border-[#27272a] overflow-hidden'
                      : isCaptions
                      ? 'h-7 bg-[#0d0d0e] border-[#27272a] overflow-hidden px-1'
                      : 'h-8 bg-[#0d0d0e] border-[#27272a] overflow-hidden px-1'
                  } ${isGhostActive ? 'ring-1 ring-zinc-400 bg-zinc-900/50' : ''}`}
                >
                  {/* Drop Ghost Marker ("Put where we want") */}
                  {isGhostActive && dropGhost && (
                    <div
                      style={{ left: `${dropGhost.percent}%` }}
                      className="absolute top-0 bottom-0 w-1 bg-white z-40 pointer-events-none shadow-[0_0_8px_white]"
                    >
                      <span className="absolute -top-4 -translate-x-1/2 px-1 py-0.2 rounded bg-white text-black font-mono text-[8px] font-black">
                        {dropGhost.timeSec}s
                      </span>
                    </div>
                  )}

                  {/* ======================================================= */}
                  {/* TRACK TYPE: DYNAMIC CAPTIONS                            */}
                  {/* ======================================================= */}
                  {isCaptions && (
                    <>
                      <span className="absolute left-1 text-[8px] font-medium text-zinc-400 uppercase tracking-tighter flex items-center gap-1 z-10 bg-[#121214] px-1 rounded pointer-events-none border border-[#27272a]">
                        <Subtitles className="w-2.5 h-2.5" /> Captions
                      </span>

                      {timeline.subtitles.map((sub) => {
                        const leftPct = (sub.startTime / totalDuration) * 100;
                        const widthPct = ((sub.endTime - sub.startTime) / totalDuration) * 100;
                        const isSubActive = currentTime >= sub.startTime && currentTime <= sub.endTime;

                        return (
                          <div
                            key={sub.id}
                            style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                            className={`absolute h-4 rounded px-1 flex items-center transition-colors ${
                              isSubActive
                                ? 'bg-zinc-200 text-zinc-900 font-bold'
                                : 'bg-zinc-800 border border-zinc-700 text-zinc-300'
                            }`}
                            title={sub.text}
                          >
                            <span className="text-[8px] truncate">{sub.text}</span>
                          </div>
                        );
                      })}
                    </>
                  )}

                  {/* ======================================================= */}
                  {/* TRACK TYPE: MAIN STRAIGHT-LINE VIDEO & PICS (ONE REEL)  */}
                  {/* Seamless contiguous filmstrip: one image after another   */}
                  {/* ======================================================= */}
                  {isMain && (
                    <div className="w-full h-full flex relative overflow-hidden bg-black/50">
                      {mainClips.length === 0 ? (
                        <div className="w-full h-full flex items-center justify-center text-[10px] text-zinc-500 font-mono">
                          Drag videos & photos here to build continuous straight sequence
                        </div>
                      ) : (
                        mainClips.map((clip, idx) => {
                          const asset = assetMap.get(clip.assetId);
                          const isVideo = clip.assetId.startsWith('VID') || asset?.type === 'video';
                          const widthPct = (clip.duration / totalDuration) * 100;
                          const isActive =
                            currentTime >= clip.startTime && currentTime < clip.startTime + clip.duration;
                          const transBadge = getTransitionBadge(clip.transition);

                          return (
                            <div
                              key={clip.id}
                              draggable={true}
                              onDragStart={(e) => handleClipDragStart(e, clip.id)}
                              onDragOver={(e) => e.preventDefault()}
                              onDrop={(e) => handleClipDropOnClip(e, clip.id)}
                              style={{ width: `${widthPct}%` }}
                              className={`h-full border-r border-black/80 relative transition group cursor-grab active:cursor-grabbing select-none overflow-hidden flex flex-col justify-between ${
                                isActive
                                  ? 'ring-2 ring-white ring-inset z-10'
                                  : 'hover:brightness-110'
                              }`}
                              title={`${clip.assetId} (${clip.startTime}s - ${(clip.startTime + clip.duration).toFixed(1)}s) • One image after another • Drag to reorder`}
                            >
                              {/* Background Thumbnail Image Filling Card ("One Image After Another") */}
                              <div className="absolute inset-0 z-0 overflow-hidden bg-zinc-900">
                                {asset?.thumbnailUrl || asset?.url ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={asset.thumbnailUrl || asset.url}
                                    alt={asset.name}
                                    className="w-full h-full object-cover pointer-events-none opacity-85 group-hover:opacity-100 transition duration-200"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center bg-zinc-900 text-zinc-600">
                                    <Film className="w-4 h-4 opacity-40" />
                                  </div>
                                )}
                                <div className="absolute inset-0 bg-gradient-to-b from-black/75 via-transparent to-black/85 pointer-events-none" />
                              </div>

                              {/* Top Bar: Sequence Number + Asset Tag + Drag Grip */}
                              <div className="relative z-10 p-1 flex items-center justify-between text-[9px] font-mono leading-none truncate">
                                <span className="font-bold text-white flex items-center gap-1 drop-shadow-sm">
                                  <GripHorizontal className="w-2.5 h-2.5 text-zinc-300 group-hover:text-white" />
                                  <span className="text-zinc-300 font-normal">#{idx + 1}</span>
                                  <span>{clip.assetId}</span>
                                </span>

                                <div className="flex items-center gap-1">
                                  {transBadge && (
                                    <span className="text-[7px] px-1 py-0.2 rounded bg-black/70 text-zinc-300 font-sans border border-white/10">
                                      {transBadge}
                                    </span>
                                  )}
                                  <button
                                    type="button"
                                    onClick={(e) => handleDeleteClip(e, clip.id)}
                                    className="opacity-0 group-hover:opacity-100 p-0.5 rounded bg-black/60 hover:text-red-400 transition cursor-pointer"
                                    title="Remove clip from sequence"
                                  >
                                    <X className="w-2.5 h-2.5" />
                                  </button>
                                </div>
                              </div>

                              {/* Bottom Bar: Duration & Media Type Badge */}
                              <div className="relative z-10 p-1 flex items-center justify-between text-[8px] font-mono leading-none text-zinc-200 drop-shadow-sm">
                                <span className="bg-black/60 px-1 py-0.5 rounded text-white font-semibold">
                                  {clip.duration.toFixed(1)}s
                                </span>
                                <span className="text-[7px] text-zinc-300 uppercase tracking-wider bg-black/50 px-1 py-0.2 rounded">
                                  {isVideo ? 'VIDEO' : 'PHOTO'}
                                </span>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}

                  {/* ======================================================= */}
                  {/* TRACK TYPE: OVERLAY / B-ITEMS LINES (ABOVE MAIN)       */}
                  {/* Allows cutting B-roll items at playhead                  */}
                  {/* ======================================================= */}
                  {track.type === 'overlay-broll' && (
                    <div className="w-full h-full relative flex items-center">
                      {trackClips.length === 0 ? (
                        <div className="text-[9px] text-zinc-600 font-mono px-2">
                          Drop B-Roll / Picture overlay here (&quot;put where you want • cut above&quot;)
                        </div>
                      ) : (
                        trackClips.map((clip) => {
                          const asset = assetMap.get(clip.assetId);
                          const leftPct = (clip.startTime / totalDuration) * 100;
                          const widthPct = (clip.duration / totalDuration) * 100;
                          const isNow = currentTime >= clip.startTime && currentTime < clip.startTime + clip.duration;
                          const isUnderPlayhead = currentTime > clip.startTime + 0.2 && currentTime < clip.startTime + clip.duration - 0.2;

                          return (
                            <div
                              key={clip.id}
                              style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                              className={`absolute h-5.5 rounded-md px-1.5 flex items-center justify-between text-[8px] font-mono border transition group ${
                                isNow
                                  ? 'bg-zinc-700 text-white border-white shadow-md'
                                  : 'bg-zinc-800/95 text-zinc-200 border-zinc-600'
                              }`}
                              title={`B-Roll Overlay: ${clip.assetId} (${clip.startTime}s - ${(clip.startTime + clip.duration).toFixed(1)}s)`}
                            >
                              <div className="flex items-center gap-1 truncate">
                                <span className="font-bold truncate">[{clip.assetId}]</span>
                                <span className="text-[7px] text-zinc-400">{clip.duration.toFixed(1)}s</span>
                              </div>

                              <div className="flex items-center gap-1">
                                {isUnderPlayhead && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleSplitClip(clip);
                                    }}
                                    className="px-1 py-0.2 rounded bg-zinc-900 text-zinc-200 hover:text-white hover:bg-black border border-zinc-500 text-[8px] flex items-center gap-0.5 cursor-pointer"
                                    title="Cut B-Roll at playhead"
                                  >
                                    <Scissors className="w-2.5 h-2.5" />
                                    <span>Cut</span>
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={(e) => handleDeleteClip(e, clip.id)}
                                  className="opacity-0 group-hover:opacity-100 ml-1 text-zinc-400 hover:text-red-400 cursor-pointer"
                                  title="Delete B-roll item"
                                >
                                  <X className="w-2.5 h-2.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}

                  {/* ======================================================= */}
                  {/* TRACK TYPE: VOICE OVER (VO_TRACK)                       */}
                  {/* ======================================================= */}
                  {track.id === 'audio_vo' && (
                    <div className="w-full h-full relative flex items-center">
                      <span className="absolute left-1 text-[8px] font-medium text-zinc-400 uppercase tracking-tighter flex items-center gap-1 z-10 bg-[#121214] px-1 rounded pointer-events-none border border-[#27272a]">
                        <Mic className="w-2.5 h-2.5" /> VO
                      </span>

                      {speechIntervals.map((interval, idx) => {
                        const leftPct = (interval.start / totalDuration) * 100;
                        const widthPct = ((interval.end - interval.start) / totalDuration) * 100;
                        const isSpeakingNow = currentTime >= interval.start && currentTime <= interval.end;

                        return (
                          <div
                            key={idx}
                            style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                            className={`absolute h-4 rounded px-1 flex items-center transition-colors ${
                              isSpeakingNow
                                ? 'bg-zinc-200 text-zinc-900 font-bold'
                                : 'bg-zinc-800 border border-zinc-700 text-zinc-300'
                            }`}
                          >
                            <span className="text-[8px] font-mono truncate">Speech</span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* ======================================================= */}
                  {/* TRACK TYPE: BACKGROUND MUSIC (BG_MUSIC DUCKING)         */}
                  {/* ======================================================= */}
                  {track.id === 'audio_bgm' && (
                    <div className="w-full h-full relative flex items-center px-1">
                      <span className="absolute left-1 text-[8px] font-medium text-zinc-400 uppercase tracking-tighter flex items-center gap-1 z-10 bg-[#121214] px-1 rounded pointer-events-none border border-[#27272a]">
                        <Music className="w-2.5 h-2.5" /> BGM
                      </span>

                      <div className="w-full h-3 bg-zinc-900 rounded border border-[#27272a] relative flex items-center">
                        {speechIntervals.map((interval, idx) => {
                          const leftPct = (interval.start / totalDuration) * 100;
                          const widthPct = ((interval.end - interval.start) / totalDuration) * 100;
                          return (
                            <div
                              key={idx}
                              style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                              className="absolute h-1 bg-zinc-600 border-t border-b border-zinc-500 rounded flex items-center justify-center"
                              title="Auto-Ducking: -16 dB during speech"
                            >
                              <span className="text-[7px] text-zinc-200 font-mono leading-none">
                                -16dB
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* ======================================================= */}
                  {/* TRACK TYPE: CUSTOM AUDIO STEMS (BELOW MAIN)             */}
                  {/* Allows cutting sound clips at playhead                  */}
                  {/* ======================================================= */}
                  {track.type === 'audio-sfx' && (
                    <div className="w-full h-full relative flex items-center px-1">
                      {trackClips.length === 0 ? (
                        <div className="text-[9px] text-zinc-600 font-mono px-2">
                          Drop audio / SFX here (&quot;put where you want • cut for sound&quot;)
                        </div>
                      ) : (
                        trackClips.map((clip) => {
                          const leftPct = (clip.startTime / totalDuration) * 100;
                          const widthPct = (clip.duration / totalDuration) * 100;
                          const isUnderPlayhead = currentTime > clip.startTime + 0.2 && currentTime < clip.startTime + clip.duration - 0.2;

                          return (
                            <div
                              key={clip.id}
                              style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                              className="absolute h-5.5 rounded-md px-1.5 flex items-center justify-between text-[8px] font-mono bg-zinc-800 border border-zinc-600 text-zinc-200 group"
                              title={`Audio: ${clip.assetId} (${clip.startTime}s - ${(clip.startTime + clip.duration).toFixed(1)}s)`}
                            >
                              <div className="flex items-center gap-1 truncate">
                                <span className="font-bold truncate">[{clip.assetId}]</span>
                                <span className="text-[7px] text-zinc-400">{clip.duration.toFixed(1)}s</span>
                              </div>

                              <div className="flex items-center gap-1">
                                {isUnderPlayhead && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleSplitClip(clip);
                                    }}
                                    className="px-1 py-0.2 rounded bg-zinc-900 text-zinc-200 hover:text-white hover:bg-black border border-zinc-500 text-[8px] flex items-center gap-0.5 cursor-pointer"
                                    title="Cut Sound at playhead"
                                  >
                                    <Scissors className="w-2.5 h-2.5" />
                                    <span>Cut</span>
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={(e) => handleDeleteClip(e, clip.id)}
                                  className="opacity-0 group-hover:opacity-100 ml-1 text-zinc-400 hover:text-red-400 cursor-pointer"
                                  title="Delete audio stem"
                                >
                                  <X className="w-2.5 h-2.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* ======================================================= */}
            {/* SCRUBBER NEEDLE (SPANS ACROSS ALL TRACKS)               */}
            {/* ======================================================= */}
            <div
              style={{ left: `${playheadPercent}%` }}
              className="absolute top-0 bottom-0 w-0.5 bg-[#ededed] z-50 pointer-events-none shadow-[0_0_8px_rgba(255,255,255,0.5)]"
            >
              <div className="w-2.5 h-2.5 bg-[#ededed] rotate-45 -translate-x-1/2 -translate-y-1 rounded-xs" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 10);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${ms}`;
}
