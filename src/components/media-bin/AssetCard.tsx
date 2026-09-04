'use client';

import React, { useState } from 'react';
import { MediaAsset } from '@/types/timeline';
import { Film, Image as ImageIcon, Mic, Music, Copy, Check, Trash2 } from 'lucide-react';

interface AssetCardProps {
  asset: MediaAsset;
  onDelete: (id: string) => void;
  onSelectTag?: (tag: string) => void;
}

export function AssetCard({ asset, onDelete, onSelectTag }: AssetCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyTag = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(asset.id);
    setCopied(true);
    onSelectTag?.(asset.id);
    setTimeout(() => setCopied(false), 1500);
  };

  const getBadgeStyle = () => {
    switch (asset.type) {
      case 'video':
        return 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30 hover:bg-cyan-500/25';
      case 'image':
        return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25';
      case 'voiceover':
        return 'bg-amber-500/15 text-amber-400 border-amber-500/30 hover:bg-amber-500/25';
      case 'music':
        return 'bg-purple-500/15 text-purple-400 border-purple-500/30 hover:bg-purple-500/25';
      default:
        return 'bg-zinc-800 text-zinc-300 border-zinc-700';
    }
  };

  const getTypeIcon = () => {
    switch (asset.type) {
      case 'video':
        return <Film className="w-3.5 h-3.5 text-cyan-400" />;
      case 'image':
        return <ImageIcon className="w-3.5 h-3.5 text-emerald-400" />;
      case 'voiceover':
        return <Mic className="w-3.5 h-3.5 text-amber-400" />;
      case 'music':
        return <Music className="w-3.5 h-3.5 text-purple-400" />;
    }
  };

  return (
    <div className="group relative rounded-xl bg-zinc-900/90 border border-zinc-800/80 p-2.5 hover:border-zinc-700 transition flex gap-3 items-center">
      {/* Thumbnail or Icon Preview */}
      <div className="w-14 h-14 rounded-lg bg-zinc-950 border border-zinc-800/80 flex-shrink-0 overflow-hidden flex items-center justify-center relative">
        {asset.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={asset.thumbnailUrl}
            alt={asset.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center justify-center gap-1 text-zinc-500">
            {getTypeIcon()}
            <span className="text-[9px] uppercase font-mono tracking-tighter">
              {asset.type.slice(0, 3)}
            </span>
          </div>
        )}

        {/* Small Type badge on thumbnail */}
        <div className="absolute bottom-0.5 right-0.5 bg-black/75 p-0.5 rounded backdrop-blur">
          {getTypeIcon()}
        </div>
      </div>

      {/* Info & Code Badge */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1 mb-1">
          {/* Clickable Code Tag Chip */}
          <button
            type="button"
            onClick={handleCopyTag}
            className={`flex items-center gap-1 px-2 py-0.5 rounded-md border text-xs font-mono font-bold tracking-wide transition cursor-pointer ${getBadgeStyle()}`}
            title="Click to copy code to prompt"
          >
            <span>{asset.id}</span>
            {copied ? (
              <Check className="w-3 h-3 text-emerald-400" />
            ) : (
              <Copy className="w-2.5 h-2.5 opacity-60 group-hover:opacity-100" />
            )}
          </button>

          {/* Delete action */}
          <button
            type="button"
            onClick={() => onDelete(asset.id)}
            className="opacity-0 group-hover:opacity-100 p-1 rounded text-zinc-500 hover:text-red-400 hover:bg-zinc-800 transition cursor-pointer"
            title="Remove asset"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* File Name */}
        <div className="text-xs font-medium text-zinc-200 truncate" title={asset.name}>
          {asset.name}
        </div>

        {/* Metadata Specs */}
        <div className="flex items-center gap-2 mt-0.5 text-[10px] text-zinc-500 font-mono">
          {asset.duration > 0 && <span>{asset.duration.toFixed(1)}s</span>}
          {asset.width && asset.height && (
            <>
              <span>•</span>
              <span>{asset.width}x{asset.height}</span>
            </>
          )}
          {asset.fileSize && (
            <>
              <span>•</span>
              <span>{(asset.fileSize / (1024 * 1024)).toFixed(1)}MB</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
