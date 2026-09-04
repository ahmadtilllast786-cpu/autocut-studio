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
  { id: 'whip-pan', name: 'Whip Pan', icon: '⚡' },
  { id: 'zoom-snap', name: 'Zoom Snap', icon: '🔍' },
  { id: 'glitch', name: 'Glitch Jitter', icon: '👾' },
  { id: 'cross-dissolve', name: 'Cross Dissolve', icon: '🔀' },
  { id: 'slide-left', name: 'Slide Left', icon: '◀' },
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
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold transition cursor-pointer flex-shrink-0 ${
                isActive
                  ? 'bg-[#18181b] text-[#00e5ff] shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#18181b]/50'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#00e5ff]' : 'text-zinc-400'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Drawer Body: Left Categories + Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* 2. Left-Side Categories */}
        <div className="w-28 border-r border-[#27272a] bg-[#121214] p-2 flex flex-col gap-1 flex-shrink-0">
          {LEFT_CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isCatActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium transition cursor-pointer text-left ${
                  isCatActive
                    ? 'bg-[#18181b] text-white font-bold border-l-2 border-[#00e5ff]'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#18181b]/40'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isCatActive ? 'text-[#00e5ff]' : 'text-zinc-500'}`} />
                <span>{cat.label}</span>
              </button>
            );
          })}

          <div className="mt-auto pt-2 border-t border-[#27272a]">
            <button
              type="button"
              onClick={onLoadSamples}
              className="w-full flex items-center justify-center gap-1.5 p-2 rounded-lg text-[10px] font-bold bg-[#18181b] hover:bg-[#27272a] text-[#00e5ff] border border-[#27272a] transition cursor-pointer"
              title="Preload sample videos, images, and audio"
            >
              <Sparkles className="w-3 h-3" />
              <span>Sample Pack</span>
            </button>
          </div>
        </div>

        {/* 3. Right Content Area: Dropzone + Asset Bin or Feature Sub-views */}
        <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3 bg-[#18181b]">
          {activeTab === 'media' && (
            <>
              {/* Dropzone with Red Highlight Region & Teal "+" Import icon */}
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
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition relative overflow-hidden ${
                  isDragging
                    ? 'border-[#00e5ff] bg-[#00e5ff]/10 shadow-[0_0_15px_rgba(0,229,255,0.2)]'
                    : 'border-red-500/50 bg-red-500/5 hover:border-red-400 hover:bg-red-500/10'
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
                <div className="flex flex-col items-center gap-2">
                  {/* Teal "+" Import Icon */}
                  <div className="w-10 h-10 rounded-full bg-[#00e5ff]/15 border border-[#00e5ff]/40 flex items-center justify-center text-[#00e5ff] shadow-md shadow-[#00e5ff]/20">
                    <Plus className="w-5 h-5 stroke-[2.5]" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-zinc-100">
                      Import Media Materials
                    </div>
                    <div className="text-[10px] text-zinc-400 mt-0.5">
                      Supports: videos, audios, photos
                    </div>
                  </div>
                </div>
              </div>

              {/* Asset Bin Header */}
              <div className="flex items-center justify-between text-xs font-bold text-zinc-300 pt-1">
                <span>Asset Bin ({assets.length})</span>
                <span className="text-[10px] font-mono text-zinc-500">Auto-Tagged</span>
              </div>

              {/* Asset Grid List */}
              <div className="grid grid-cols-2 sm:grid-cols-2 gap-2">
                {assets.map((asset) => (
                  <div
                    key={asset.id}
                    className="p-2 rounded-xl bg-[#121214] border border-[#27272a] hover:border-[#3f3f46] flex flex-col justify-between gap-1.5 transition group"
                  >
                    {/* Thumbnail or Type Icon */}
                    <div className="h-16 w-full rounded-lg bg-[#0d0d0f] overflow-hidden flex items-center justify-center relative">
                      {asset.thumbnailUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={asset.thumbnailUrl}
                          alt={asset.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Film className="w-6 h-6 text-zinc-600" />
                      )}

                      {/* Code Badge ([VID_01], [IMG_01], [VO_TRACK]) */}
                      <button
                        type="button"
                        onClick={() => handleCopyTag(asset.id)}
                        className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-black bg-black/85 text-[#00e5ff] border border-[#00e5ff]/40 flex items-center gap-1 shadow cursor-pointer hover:scale-105 transition"
                        title="Click to copy code tag"
                      >
                        <span>[{asset.id}]</span>
                        {copiedId === asset.id ? (
                          <Check className="w-2.5 h-2.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-2 h-2 opacity-60" />
                        )}
                      </button>

                      {/* Delete button */}
                      <button
                        type="button"
                        onClick={() => onDeleteAsset(asset.id)}
                        className="opacity-0 group-hover:opacity-100 absolute top-1 right-1 p-1 rounded bg-black/80 text-zinc-400 hover:text-red-400 transition cursor-pointer"
                        title="Delete asset"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Asset Name & Duration */}
                    <div className="text-[11px] font-medium text-zinc-200 truncate">
                      {asset.name}
                    </div>
                    <div className="flex items-center justify-between text-[9px] font-mono text-zinc-500">
                      <span className="uppercase">{asset.type}</span>
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
              <div className="text-xs font-bold text-zinc-300">Transition Presets</div>
              <div className="grid grid-cols-2 gap-2">
                {TRANSITION_PRESETS.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => onApplyTransitionToAll?.(t.id)}
                    className="p-3 rounded-xl bg-[#121214] border border-[#27272a] hover:border-[#00e5ff] text-left transition flex items-center gap-2 cursor-pointer group"
                  >
                    <span className="text-lg">{t.icon}</span>
                    <div>
                      <div className="text-xs font-bold text-white group-hover:text-[#00e5ff]">
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
              <div className="text-xs font-bold text-zinc-300">Color Grading Filters</div>
              <div className="grid grid-cols-2 gap-2">
                {FILTER_PRESETS.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => onApplyFilterToAll?.(f.id)}
                    className={`p-3 rounded-xl bg-gradient-to-br ${f.bg} border border-[#27272a] hover:border-[#00e5ff] text-left transition cursor-pointer group`}
                  >
                    <div className="text-xs font-bold text-white group-hover:text-[#00e5ff]">
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
              <div className="text-xs font-bold text-zinc-300">Audio Tracks & Stems</div>
              <p className="text-[11px] text-zinc-400">
                Voiceover narration (`VO_TRACK`) automatically ducks Background Music (`BG_MUSIC`) by -16 dB.
              </p>
              {assets.filter((a) => a.type === 'voiceover' || a.type === 'music').map((a) => (
                <div key={a.id} className="p-2.5 rounded-xl bg-[#121214] border border-[#27272a] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Music className="w-4 h-4 text-purple-400" />
                    <div>
                      <div className="text-xs font-bold text-white">[{a.id}] {a.name}</div>
                      <div className="text-[10px] text-zinc-500 font-mono">{a.duration}s</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopyTag(a.id)}
                    className="text-[10px] font-mono font-bold px-2 py-1 rounded bg-[#18181b] text-[#00e5ff] border border-[#27272a]"
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
              <Sparkles className="w-6 h-6 mb-2 text-[#00e5ff] opacity-40" />
              <p className="text-xs font-semibold text-zinc-300 capitalize">{activeTab} Library</p>
              <p className="text-[11px] text-zinc-500 mt-1">Ready for automated sequencing</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
