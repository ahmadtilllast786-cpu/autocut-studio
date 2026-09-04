'use client';

import React, { useState, useRef } from 'react';
import { MediaAsset, TransitionType, ColorFilterType } from '@/types/timeline';
import {
  Film,
  Music,
  Type,
  Smile,
  Wand2,
  Shuffle,
  Subtitles,
  SlidersHorizontal,
  Folder,
  Cloud,
  Library,
  Bookmark,
  Plus,
  Copy,
  Check,
  Trash2,
  UploadCloud,
  Sparkles,
  Layers,
  GripVertical,
  Upload,
} from 'lucide-react';

interface MediaDrawerPanelProps {
  assets: MediaAsset[];
  onAddAsset: (asset: MediaAsset) => void;
  onDeleteAsset: (id: string) => void;
  onLoadSamples: () => void;
  onInsertTag?: (tag: string) => void;
  onApplyTransitionToAll?: (transition: TransitionType) => void;
  onApplyFilterToAll?: (filter: ColorFilterType) => void;
}

const TOP_TABS = [
  { id: 'media', label: 'Media', icon: Film },
  { id: 'audio', label: 'Audio', icon: Music },
  { id: 'text', label: 'Text', icon: Type },
  { id: 'stickers', label: 'Stickers', icon: Smile },
  { id: 'effects', label: 'Effects', icon: Wand2 },
  { id: 'transitions', label: 'Transitions', icon: Shuffle },
  { id: 'captions', label: 'Captions', icon: Subtitles },
  { id: 'filters', label: 'Filters', icon: SlidersHorizontal },
  { id: 'adjustment', label: 'Adjustment', icon: Layers },
];

const LEFT_CATEGORIES = [
  { id: 'local', label: 'Local', icon: Folder },
  { id: 'spaces', label: 'Spaces', icon: Cloud },
  { id: 'library', label: 'Library', icon: Library },
  { id: 'brand', label: 'Brand Assets', icon: Bookmark },
];

const TRANSITION_PRESETS: Array<{ id: TransitionType; name: string; icon: string }> = [
  { id: 'punch_in', name: 'Punch In', icon: '🥊' },
  { id: 'whip_pan', name: 'Whip Pan', icon: '⚡' },
  { id: 'ken_burns_zoom', name: 'Ken Burns Zoom', icon: '🔍' },
  { id: 'white_flash', name: 'White Flash', icon: '✨' },
  { id: 'none', name: 'Hard Cut', icon: '•' },
];

const FILTER_PRESETS: Array<{ id: ColorFilterType; name: string; bg: string }> = [
  { id: 'cyber', name: 'Cyber Neon', bg: 'from-cyan-900 to-blue-950' },
  { id: 'warm-vintage', name: 'Warm Vintage', bg: 'from-amber-950 to-orange-950' },
  { id: 'noir', name: 'B&W Noir', bg: 'from-zinc-800 to-zinc-950' },
  { id: 'high-contrast', name: 'High Contrast', bg: 'from-purple-950 to-zinc-950' },
  { id: 'teal-orange', name: 'Teal & Orange', bg: 'from-teal-950 to-orange-950' },
  { id: 'cinematic', name: 'Cinematic Log', bg: 'from-slate-900 to-zinc-900' },
];

export function MediaDrawerPanel({
  assets,
  onAddAsset,
  onDeleteAsset,
  onLoadSamples,
  onInsertTag,
  onApplyTransitionToAll,
  onApplyFilterToAll,
}: MediaDrawerPanelProps) {
  const [activeTab, setActiveTab] = useState('media');
  const [activeCategory, setActiveCategory] = useState('local');
  const [isDragging, setIsDragging] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCopyTag = (tag: string) => {
    navigator.clipboard.writeText(tag);
    setCopiedId(tag);
    onInsertTag?.(tag);
    setTimeout(() => setCopiedId(null), 1200);
  };

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const isVideo = file.type.startsWith('video/') || /\.(mp4|mov|webm)$/i.test(file.name);
      const isAudio = file.type.startsWith('audio/') || /\.(mp3|wav|ogg)$/i.test(file.name);
      const objectUrl = URL.createObjectURL(file);

      let id = `IMG_${String(assets.length + 1).padStart(2, '0')}`;
      let type: MediaAsset['type'] = 'image';

      if (isVideo) {
        const vidCount = assets.filter((a) => a.type === 'video').length + 1;
        id = `VID_${String(vidCount).padStart(2, '0')}`;
        type = 'video';
      } else if (isAudio) {
        id = assets.some((a) => a.id === 'VO_TRACK') ? 'BG_MUSIC' : 'VO_TRACK';
        type = id === 'VO_TRACK' ? 'voiceover' : 'music';
      }

      onAddAsset({
        id,
        type,
        name: file.name,
        url: objectUrl,
        duration: isVideo ? 12 : isAudio ? 60 : 5,
        thumbnailUrl: isVideo ? '' : objectUrl,
        fileSize: file.size,
      });
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#121214] text-zinc-200 select-none overflow-hidden">
      {/* 1. Top Navigation Tabs */}
      <div className="h-10 border-b border-[#27272a] bg-[#121214] flex items-center px-2 gap-1 overflow-x-auto no-scrollbar flex-shrink-0">
        {TOP_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition cursor-pointer flex-shrink-0 ${
                isActive
                  ? 'bg-[#18181b] text-[#ededed] border border-[#27272a]'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#18181b]/50'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#ededed]' : 'text-zinc-400'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Drawer Body: Left Categories + Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* 2. Left-Side Categories (Compact & Clean) */}
        <div className="w-16 border-r border-[#27272a] bg-[#121214] py-2 px-1 flex flex-col items-center gap-1 flex-shrink-0">
          {LEFT_CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isCatActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                className={`w-full flex flex-col items-center justify-center py-2 px-1 rounded-xl text-[10px] font-medium transition cursor-pointer text-center ${
                  isCatActive
                    ? 'bg-[#1e1e24] text-[#ededed] font-bold border border-zinc-600 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#18181b]/50'
                }`}
                title={cat.label}
              >
                <Icon className={`w-4 h-4 mb-1 ${isCatActive ? 'text-white' : 'text-zinc-400'}`} />
                <span className="truncate w-full text-center leading-tight">{cat.label.split(' ')[0]}</span>
              </button>
            );
          })}

          <div className="mt-auto pt-2 border-t border-[#27272a] w-full flex flex-col items-center">
            <button
              type="button"
              onClick={onLoadSamples}
              className="w-full flex flex-col items-center justify-center py-2 px-1 rounded-xl text-[9px] font-medium bg-[#18181b] hover:bg-[#27272a] text-zinc-300 border border-[#27272a] transition cursor-pointer text-center"
              title="Preload sample videos, images, and audio"
            >
              <Sparkles className="w-3.5 h-3.5 mb-0.5 text-zinc-300" />
              <span>Samples</span>
            </button>
          </div>
        </div>

        {/* 3. Right Content Area: Dropzone + Asset Bin or Feature Sub-views */}
        <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3.5 bg-[#18181b]">
          {activeTab === 'media' && (
            <>
              {/* Big, Clear, High-Visibility Upload Dropzone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  handleFiles(e.dataTransfer.files);
                }}
                className={`border-2 border-dashed rounded-2xl p-5 sm:p-6 text-center transition-all relative overflow-hidden flex flex-col items-center justify-center gap-3 ${
                  isDragging
                    ? 'border-white bg-zinc-800/90 shadow-2xl scale-[1.01]'
                    : 'border-zinc-600 bg-[#121214] hover:border-zinc-300 hover:bg-[#151518]'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="video/*,image/*,audio/*"
                  className="hidden"
                  onChange={(e) => handleFiles(e.target.files)}
                />
                
                {/* Big Upload Cloud Icon */}
                <div className="w-12 h-12 rounded-2xl bg-[#1e1e24] border border-[#3f3f46] flex items-center justify-center text-white shadow-md">
                  <UploadCloud className="w-6 h-6 text-zinc-200" />
                </div>

                <div>
                  <div className="text-sm font-bold text-white tracking-tight">
                    Upload Videos, Photos & Audio
                  </div>
                  <div className="text-xs text-zinc-400 mt-0.5">
                    Drag and drop your raw media files directly here
                  </div>
                </div>

                {/* Clear Format Badges */}
                <div className="flex items-center justify-center gap-1.5 flex-wrap">
                  {['MP4', 'MOV', 'PNG', 'JPG', 'MP3', 'WAV'].map((ext) => (
                    <span
                      key={ext}
                      className="px-2 py-0.5 rounded-md bg-[#1e1e24] border border-[#3f3f46] text-[10px] font-mono font-bold text-zinc-300"
                    >
                      .{ext}
                    </span>
                  ))}
                </div>

                {/* Big Clear Upload Button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-1 px-5 py-2 rounded-xl text-xs font-bold bg-white text-zinc-950 hover:bg-zinc-200 shadow-md transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer flex items-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  <span>Browse & Upload Files</span>
                </button>
              </div>

              {/* Asset Bin Header with Draggable Instruction */}
              <div className="flex items-center justify-between text-xs font-semibold text-zinc-300 pt-1">
                <div className="flex items-center gap-1.5">
                  <span>Asset Bin ({assets.length})</span>
                  <span className="text-[10px] text-zinc-400 font-normal hidden sm:inline">
                    • Drag onto timeline tracks
                  </span>
                </div>
                <span className="text-[10px] font-mono text-zinc-500">Auto-Tagged</span>
              </div>

              {/* Asset Grid List (Draggable Cards) */}
              <div className="grid grid-cols-2 gap-2">
                {assets.map((asset) => (
                  <div
                    key={asset.id}
                    draggable={true}
                    onDragStart={(e) => {
                      e.dataTransfer.setData(
                        'application/json',
                        JSON.stringify({
                          assetId: asset.id,
                          type: asset.type,
                          duration: asset.duration,
                          name: asset.name,
                        })
                      );
                      e.dataTransfer.effectAllowed = 'copy';
                    }}
                    className="p-2 rounded-xl bg-[#121214] border border-[#27272a] hover:border-zinc-400 flex flex-col justify-between gap-1.5 transition group cursor-grab active:cursor-grabbing select-none"
                    title="Drag and drop onto any timeline track"
                  >
                    {/* Thumbnail or Type Icon */}
                    <div className="h-16 w-full rounded-lg bg-[#0d0d0e] overflow-hidden flex items-center justify-center relative">
                      {asset.thumbnailUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={asset.thumbnailUrl}
                          alt={asset.name}
                          className="w-full h-full object-cover pointer-events-none"
                        />
                      ) : (
                        <Film className="w-6 h-6 text-zinc-600" />
                      )}

                      {/* Drag Handle Indicator Pill */}
                      <div className="absolute top-1 left-1 px-1 py-0.5 rounded bg-black/75 text-zinc-300 text-[8px] flex items-center gap-0.5 opacity-80 group-hover:opacity-100">
                        <GripVertical className="w-2.5 h-2.5 text-zinc-400" />
                        <span className="font-mono">DRAG</span>
                      </div>

                      {/* Code Badge ([VID_01], [IMG_01], [VO_TRACK]) */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopyTag(asset.id);
                        }}
                        className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-[#0d0d0e]/90 text-zinc-200 border border-[#27272a] flex items-center gap-1 shadow cursor-pointer hover:border-zinc-400 transition"
                        title="Click to copy code tag"
                      >
                        <span>[{asset.id}]</span>
                        {copiedId === asset.id ? (
                          <Check className="w-2.5 h-2.5 text-zinc-300" />
                        ) : (
                          <Copy className="w-2 h-2 opacity-60" />
                        )}
                      </button>

                      {/* Delete button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteAsset(asset.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 absolute top-1 right-1 p-1 rounded bg-black/80 text-zinc-400 hover:text-red-400 transition cursor-pointer"
                        title="Delete asset"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Asset Name & Duration */}
                    <div className="text-[11px] font-medium text-[#ededed] truncate">
                      {asset.name}
                    </div>
                    <div className="flex items-center justify-between text-[9px] font-mono text-zinc-500">
                      <span className="uppercase font-semibold text-zinc-400">{asset.type}</span>
                      {asset.duration > 0 && <span>{asset.duration.toFixed(1)}s</span>}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Transitions Feature View */}
          {activeTab === 'transitions' && (
            <div className="space-y-2">
              <div className="text-xs font-semibold text-zinc-300">Transition Presets</div>
              <div className="grid grid-cols-2 gap-2">
                {TRANSITION_PRESETS.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => onApplyTransitionToAll?.(t.id)}
                    className="p-3 rounded-xl bg-[#121214] border border-[#27272a] hover:border-zinc-500 text-left transition flex items-center gap-2 cursor-pointer group"
                  >
                    <span className="text-base">{t.icon}</span>
                    <div>
                      <div className="text-xs font-medium text-[#ededed] group-hover:text-white">
                        {t.name}
                      </div>
                      <div className="text-[9px] text-zinc-500">Apply to all cuts</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Color Filters Feature View */}
          {activeTab === 'filters' && (
            <div className="space-y-2">
              <div className="text-xs font-semibold text-zinc-300">Color Grading Filters</div>
              <div className="grid grid-cols-2 gap-2">
                {FILTER_PRESETS.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => onApplyFilterToAll?.(f.id)}
                    className={`p-3 rounded-xl bg-gradient-to-br ${f.bg} border border-[#27272a] hover:border-zinc-400 text-left transition cursor-pointer group`}
                  >
                    <div className="text-xs font-medium text-white">
                      {f.name}
                    </div>
                    <div className="text-[9px] text-zinc-400 mt-1">Preset LUT</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Audio Stems View */}
          {activeTab === 'audio' && (
            <div className="space-y-2">
              <div className="text-xs font-semibold text-zinc-300">Audio Tracks & Stems</div>
              <p className="text-[11px] text-zinc-400">
                Voiceover narration (`VO_TRACK`) automatically ducks Background Music (`BG_MUSIC`) by -16 dB.
              </p>
              {assets.filter((a) => a.type === 'voiceover' || a.type === 'music').map((a) => (
                <div key={a.id} className="p-2.5 rounded-xl bg-[#121214] border border-[#27272a] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Music className="w-4 h-4 text-zinc-400" />
                    <div>
                      <div className="text-xs font-medium text-[#ededed]">[{a.id}] {a.name}</div>
                      <div className="text-[10px] text-zinc-500 font-mono">{a.duration}s</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopyTag(a.id)}
                    className="text-[10px] font-mono font-medium px-2 py-1 rounded bg-[#18181b] text-zinc-300 border border-[#27272a] hover:bg-[#27272a] transition cursor-pointer"
                  >
                    Copy
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Other Tabs Fallback */}
          {!['media', 'transitions', 'filters', 'audio'].includes(activeTab) && (
            <div className="h-40 flex flex-col items-center justify-center text-center p-4 border border-dashed border-[#27272a] rounded-xl text-zinc-500">
              <Sparkles className="w-6 h-6 mb-2 text-zinc-600" />
              <p className="text-xs font-medium text-zinc-300 capitalize">{activeTab} Library</p>
              <p className="text-[11px] text-zinc-500 mt-1">Ready for automated sequencing</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
