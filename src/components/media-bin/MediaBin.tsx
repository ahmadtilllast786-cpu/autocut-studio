'use client';

import React, { useState, useRef } from 'react';
import { MediaAsset } from '@/types/timeline';
import { AssetCard } from './AssetCard';
import { UploadCloud, Plus, Film, Image as ImageIcon, Music, Tag, Copy, Check } from 'lucide-react';

interface MediaBinProps {
  assets: MediaAsset[];
  onAddAsset: (asset: MediaAsset) => void;
  onDeleteAsset: (id: string) => void;
  onTagClicked?: (tag: string) => void;
}

export function MediaBin({ assets, onAddAsset, onDeleteAsset, onTagClicked }: MediaBinProps) {
  const [filter, setFilter] = useState<'all' | 'video' | 'image' | 'audio'>('all');
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [copiedAll, setCopiedAll] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredAssets = assets.filter((asset) => {
    if (filter === 'all') return true;
    if (filter === 'video') return asset.type === 'video';
    if (filter === 'image') return asset.type === 'image';
    if (filter === 'audio') return asset.type === 'voiceover' || asset.type === 'music';
    return true;
  });

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsProcessing(true);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const asset = await processUploadedFile(file, assets);
        onAddAsset(asset);
      } catch (err) {
        console.error('Error processing file:', file.name, err);
      }
    }

    setIsProcessing(false);
  };

  const processUploadedFile = async (
    file: File,
    currentAssets: MediaAsset[]
  ): Promise<MediaAsset> => {
    const isVideo = file.type.startsWith('video/') || /\.(mp4|mov|webm|m4v)$/i.test(file.name);
    const isImage = file.type.startsWith('image/') || /\.(png|jpe?g|webp|gif)$/i.test(file.name);
    const isAudio = file.type.startsWith('audio/') || /\.(mp3|wav|ogg|m4a)$/i.test(file.name);

    const objectUrl = URL.createObjectURL(file);

    if (isVideo) {
      // Count existing videos
      const vidCount = currentAssets.filter((a) => a.type === 'video').length + 1;
      const id = `VID_${String(vidCount).padStart(2, '0')}`;

      // Extract duration and thumbnail
      const { duration, width, height, thumbnail } = await extractVideoMetadata(objectUrl);

      return {
        id,
        type: 'video',
        name: file.name,
        url: objectUrl,
        duration: duration || 10,
        width: width || 1080,
        height: height || 1920,
        thumbnailUrl: thumbnail,
        fileSize: file.size,
      };
    } else if (isImage) {
      const imgCount = currentAssets.filter((a) => a.type === 'image').length + 1;
      const id = `IMG_${String(imgCount).padStart(2, '0')}`;
      const { width, height } = await extractImageMetadata(objectUrl);

      return {
        id,
        type: 'image',
        name: file.name,
        url: objectUrl,
        duration: 5.0,
        width: width || 1080,
        height: height || 1920,
        thumbnailUrl: objectUrl,
        fileSize: file.size,
      };
    } else if (isAudio) {
      // Determine if voiceover or background music
      const hasVoiceover = currentAssets.some((a) => a.id === 'VO_TRACK');
      const isVoiceoverName = /voice|vo|narrat|speech|vocal/i.test(file.name);
      const isVoiceover = isVoiceoverName || !hasVoiceover;

      const id = isVoiceover ? 'VO_TRACK' : 'BG_MUSIC';
      const duration = await extractAudioDuration(objectUrl);

      return {
        id,
        type: isVoiceover ? 'voiceover' : 'music',
        name: file.name,
        url: objectUrl,
        duration: duration || 60,
        fileSize: file.size,
      };
    } else {
      // Fallback as image
      const id = `IMG_${String(currentAssets.length + 1).padStart(2, '0')}`;
      return {
        id,
        type: 'image',
        name: file.name,
        url: objectUrl,
        duration: 5.0,
        thumbnailUrl: objectUrl,
        fileSize: file.size,
      };
    }
  };

  const extractVideoMetadata = (
    url: string
  ): Promise<{ duration: number; width: number; height: number; thumbnail: string }> => {
    return new Promise((resolve) => {
      const vid = document.createElement('video');
      vid.crossOrigin = 'anonymous';
      vid.muted = true;
      vid.src = url;

      vid.onloadedmetadata = () => {
        vid.currentTime = Math.min(1.0, vid.duration / 2);
      };

      vid.onseeked = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 320;
        canvas.height = 180;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(vid, 0, 0, 320, 180);
          const thumbnail = canvas.toDataURL('image/jpeg', 0.8);
          resolve({
            duration: vid.duration,
            width: vid.videoWidth,
            height: vid.videoHeight,
            thumbnail,
          });
        } else {
          resolve({
            duration: vid.duration,
            width: vid.videoWidth,
            height: vid.videoHeight,
            thumbnail: '',
          });
        }
      };

      vid.onerror = () => {
        resolve({ duration: 10, width: 1080, height: 1920, thumbnail: '' });
      };

      setTimeout(() => {
        resolve({ duration: vid.duration || 10, width: 1080, height: 1920, thumbnail: '' });
      }, 2500);
    });
  };

  const extractImageMetadata = (
    url: string
  ): Promise<{ width: number; height: number }> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        resolve({ width: img.naturalWidth, height: img.naturalHeight });
      };
      img.onerror = () => {
        resolve({ width: 1080, height: 1920 });
      };
      img.src = url;
    });
  };

  const extractAudioDuration = (url: string): Promise<number> => {
    return new Promise((resolve) => {
      const audio = new Audio(url);
      audio.onloadedmetadata = () => {
        resolve(audio.duration);
      };
      audio.onerror = () => {
        resolve(60);
      };
      setTimeout(() => resolve(60), 2000);
    });
  };

  const handleCopyAllCodes = () => {
    const codeList = assets.map((a) => a.id).join(', ');
    navigator.clipboard.writeText(codeList);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 1500);
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950/60 border-r border-zinc-800/80">
      {/* Panel Header */}
      <div className="p-4 border-b border-zinc-800/80">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-indigo-400" />
            <h2 className="text-sm font-bold text-white tracking-wide">Media Bin & Asset Codes</h2>
          </div>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300">
            {assets.length} Assets
          </span>
        </div>

        {/* Drag & Drop Upload Dropzone */}
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
          className={`border-2 border-dashed rounded-xl p-3.5 text-center cursor-pointer transition ${
            isDragging
              ? 'border-indigo-500 bg-indigo-500/10'
              : 'border-zinc-800 hover:border-zinc-700 bg-zinc-900/40 hover:bg-zinc-900/80'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="video/mp4,video/quicktime,video/webm,image/png,image/jpeg,image/webp,audio/mpeg,audio/wav"
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
          <div className="flex flex-col items-center gap-1.5">
            <div className="w-8 h-8 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400">
              <UploadCloud className="w-4 h-4" />
            </div>
            <div className="text-xs font-semibold text-zinc-300">
              {isProcessing ? 'Processing & Tagging...' : 'Drop files or Browse'}
            </div>
            <div className="text-[10px] text-zinc-500">
              MP4, MOV, PNG, JPG, MP3, WAV
            </div>
          </div>
        </div>
      </div>

      {/* Code Registry Chips Bar */}
      {assets.length > 0 && (
        <div className="px-4 py-2.5 bg-zinc-900/30 border-b border-zinc-800/80 flex items-center justify-between gap-2 overflow-x-auto">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-bold text-zinc-500 uppercase">Tags:</span>
            {assets.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => onTagClicked?.(a.id)}
                className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 border border-zinc-700/60 transition cursor-pointer"
                title={`Click to insert ${a.id}`}
              >
                {a.id}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={handleCopyAllCodes}
            className="text-[10px] text-zinc-400 hover:text-white flex items-center gap-1 px-2 py-1 rounded bg-zinc-800/50 hover:bg-zinc-800 transition flex-shrink-0 cursor-pointer"
            title="Copy all tags"
          >
            {copiedAll ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            <span>Copy All</span>
          </button>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="px-4 pt-3 flex items-center gap-1">
        {[
          { id: 'all', label: 'All' },
          { id: 'video', label: 'Videos' },
          { id: 'image', label: 'Images' },
          { id: 'audio', label: 'Audio' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setFilter(tab.id as typeof filter)}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer ${
              filter === tab.id
                ? 'bg-zinc-800 text-white shadow-sm'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Asset List Scrollable */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
        {filteredAssets.length === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center text-center p-4 border border-dashed border-zinc-800 rounded-xl text-zinc-500">
            <Film className="w-6 h-6 mb-2 opacity-40" />
            <p className="text-xs">No media assets in this category.</p>
            <p className="text-[11px] text-zinc-600 mt-1">Upload files or click &quot;Load Sample Assets&quot;</p>
          </div>
        ) : (
          filteredAssets.map((asset) => (
            <AssetCard
              key={asset.id}
              asset={asset}
              onDelete={onDeleteAsset}
              onSelectTag={onTagClicked}
            />
          ))
        )}
      </div>
    </div>
  );
}
