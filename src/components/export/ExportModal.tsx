'use client';

import React, { useState } from 'react';
import { Timeline, MediaAsset } from '@/types/timeline';
import { renderAndExportVideo, RenderProgress } from '@/lib/videoExporter';
import confetti from 'canvas-confetti';
import {
  X,
  Download,
  Film,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Play,
  RotateCcw,
} from 'lucide-react';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  timeline: Timeline;
  assets: MediaAsset[];
  defaultResolution?: '1080x1920' | '720x1280';
}

export function ExportModal({
  isOpen,
  onClose,
  timeline,
  assets,
  defaultResolution = '1080x1920',
}: ExportModalProps) {
  const [resolution, setResolution] = useState<'1080x1920' | '720x1280'>(defaultResolution);
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState<RenderProgress | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleStartExport = async () => {
    setIsExporting(true);
    setErrorMessage(null);
    setDownloadUrl(null);
    setProgress({
      percentage: 1,
      currentSecond: 0,
      totalSeconds: timeline.totalDuration,
      statusText: 'Initializing video compilation graph...',
    });

    try {
      const blob = await renderAndExportVideo({
        timeline,
        assets,
        resolution,
        fps: 30,
        onProgress: (p) => setProgress(p),
      });

      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);

      // Trigger celebratory confetti
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
    } catch (err: unknown) {
      console.error('Video export error:', err);
      setErrorMessage(err instanceof Error ? err.message : 'Video export failed.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownload = () => {
    if (!downloadUrl) return;
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = `AutoCut_Studio_60s_${Date.now()}.mp4`;
    a.click();
  };

  const resetModal = () => {
    setIsExporting(false);
    setProgress(null);
    setDownloadUrl(null);
    setErrorMessage(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden text-zinc-200 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-950/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Film className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Export 9:16 Vertical Video</h2>
              <p className="text-xs text-zinc-400">Compile canvas layers, motion effects, ducked audio, and captions</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5">
          {!isExporting && !downloadUrl && (
            <>
              {/* Resolution Selector */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Target Resolution & Bitrate
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setResolution('1080x1920')}
                    className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                      resolution === '1080x1920'
                        ? 'border-indigo-500 bg-indigo-500/10 text-white shadow-sm'
                        : 'border-zinc-800 bg-zinc-950 hover:bg-zinc-800/40 text-zinc-400'
                    }`}
                  >
                    <div className="text-xs font-bold">1080x1920 (Full HD)</div>
                    <div className="text-[10px] text-zinc-500 mt-1">
                      Crisp, high-fidelity export for TikTok, Reels, Shorts
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setResolution('720x1280')}
                    className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                      resolution === '720x1280'
                        ? 'border-indigo-500 bg-indigo-500/10 text-white shadow-sm'
                        : 'border-zinc-800 bg-zinc-950 hover:bg-zinc-800/40 text-zinc-400'
                    }`}
                  >
                    <div className="text-xs font-bold">720x1280 (Fast)</div>
                    <div className="text-[10px] text-zinc-500 mt-1">
                      Rapid rendering with compact file size
                    </div>
                  </button>
                </div>
              </div>

              {/* Specs Summary */}
              <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs space-y-2">
                <div className="text-zinc-300 font-semibold flex items-center justify-between">
                  <span>Render Pipeline Specifications:</span>
                  <span className="text-[11px] font-mono text-indigo-400">Ready</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] text-zinc-400 font-mono">
                  <div>• Aspect Ratio: 9:16 Vertical</div>
                  <div>• Frame Rate: 30 FPS</div>
                  <div>• Total Duration: {timeline.totalDuration}s</div>
                  <div>• Audio: Ducked (-16 dB)</div>
                  <div>• Subtitles: Baked-in Viral</div>
                  <div>• Format: MP4 / WebM</div>
                </div>
              </div>
            </>
          )}

          {/* Rendering Progress View */}
          {isExporting && progress && (
            <div className="space-y-4 py-4">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-zinc-200">Rendering Video...</span>
                <span className="font-mono text-indigo-400 font-bold text-sm">
                  {progress.percentage}%
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-zinc-800 h-3 rounded-full overflow-hidden p-0.5">
                <div
                  style={{ width: `${progress.percentage}%` }}
                  className="bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 h-full rounded-full transition-all duration-200"
                />
              </div>

              <div className="text-[11px] font-mono text-zinc-400 text-center">
                {progress.statusText}
              </div>
            </div>
          )}

          {/* Finished View */}
          {downloadUrl && (
            <div className="space-y-4 text-center py-2">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Video Render Complete!</h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Your 60-second vertical cut is ready for publishing.
                </p>
              </div>

              {/* Downloaded Video Preview */}
              <div className="max-w-[200px] mx-auto rounded-xl overflow-hidden border border-zinc-800 aspect-[9/16] bg-black shadow-lg">
                <video
                  src={downloadUrl}
                  controls
                  playsInline
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          )}

          {/* Error View */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-zinc-800 bg-zinc-950/50 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            disabled={isExporting}
            className="px-4 py-2 text-xs font-medium text-zinc-400 hover:text-white rounded-lg transition cursor-pointer"
          >
            {downloadUrl ? 'Close' : 'Cancel'}
          </button>

          {!isExporting && !downloadUrl && (
            <button
              type="button"
              onClick={handleStartExport}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 hover:opacity-95 shadow-lg shadow-indigo-600/30 transition cursor-pointer active:scale-95"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Start Rendering 1080x1920</span>
            </button>
          )}

          {downloadUrl && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={resetModal}
                className="flex items-center gap-1 px-3 py-2 text-xs font-medium text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 rounded-lg transition cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Render Again</span>
              </button>
              <button
                type="button"
                onClick={handleDownload}
                className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-md shadow-emerald-600/30 transition cursor-pointer active:scale-95"
              >
                <Download className="w-4 h-4" />
                <span>Download MP4 File</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
