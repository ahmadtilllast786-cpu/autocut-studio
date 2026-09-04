'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Bug,
  Check,
  CheckCircle2,
  XCircle,
  Clipboard,
  RefreshCw,
  X,
  Zap,
  Filter,
  Search,
  AlertTriangle,
  Code2,
} from 'lucide-react';
import { Timeline, MediaAsset } from '@/types/timeline';
import { AppSettings } from '@/components/SettingsModal';
import { FeatureModule, InspectionContext } from '@/lib/features.manifest';
import { runFeatureAudit, AuditReport, AuditItemResult } from '@/lib/featureScanner';
import { DEFAULT_TIMELINE, SAMPLE_ASSETS } from '@/lib/sampleAssets';

interface SelfCodeDiagnosticProps {
  timeline?: Timeline;
  assets?: MediaAsset[];
  settings?: AppSettings;
  currentTime?: number;
}

const DEFAULT_SETTINGS_FALLBACK: AppSettings = {
  provider: 'smart-director',
  geminiKey: '',
  geminiModel: 'gemini-2.5-flash',
  openaiKey: '',
  openaiModel: 'gpt-4o-mini',
  whisperKey: '',
  duckingDb: -16,
  exportResolution: '1080x1920',
};

const MODULE_OPTIONS: Array<'All' | 'Dead Only' | FeatureModule> = [
  'All',
  'Dead Only',
  'Captions',
  'MediaBin',
  'Timeline',
  'Audio',
  'Canvas',
];

export function SelfCodeDiagnostic({
  timeline = DEFAULT_TIMELINE,
  assets = SAMPLE_ASSETS,
  settings = DEFAULT_SETTINGS_FALLBACK,
  currentTime = 0,
}: SelfCodeDiagnosticProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'All' | 'Dead Only' | FeatureModule>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [copied, setCopied] = useState(false);
  const [report, setReport] = useState<AuditReport | null>(null);

  // Memoized context builder
  const currentContext: InspectionContext = useMemo(
    () => ({
      timeline,
      assets,
      settings,
      currentTime,
    }),
    [timeline, assets, settings, currentTime]
  );

  // Scan execution
  const executeScan = useCallback(() => {
    setIsScanning(true);
    // Allow UI animation tick
    setTimeout(() => {
      const result = runFeatureAudit(currentContext);
      setReport(result);
      setIsScanning(false);
    }, 250);
  }, [currentContext]);

  // Run initial scan on mount or when context updates
  useEffect(() => {
    executeScan();
  }, [executeScan]);

  // Self Code Diagnostic is always accessible to inspect working vs dead code

  const deadCount = report ? report.deadCount : 0;
  const activeCount = report ? report.activeCount : 0;
  const totalCount = report ? report.totalFeatures : 0;

  // Filter items based on activeFilter and searchQuery
  const filteredItems = useMemo(() => {
    if (!report) return [];
    let items = report.allResults;

    if (activeFilter === 'Dead Only') {
      items = items.filter((i) => i.status === 'DEAD');
    } else if (activeFilter !== 'All') {
      items = items.filter((i) => i.module === activeFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter(
        (i) =>
          i.label.toLowerCase().includes(q) ||
          i.targetHookOrState.toLowerCase().includes(q) ||
          i.description.toLowerCase().includes(q) ||
          i.componentFile.toLowerCase().includes(q)
      );
    }

    return items;
  }, [report, activeFilter, searchQuery]);

  const handleCopyReport = () => {
    if (!report) return;
    navigator.clipboard.writeText(report.markdownReport);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  return (
    <>
      {/* ========================================================================= */}
      {/* 1. "SELF CODE" TRIGGER BUTTON (PINNED BOTTOM-LEFT CORNER)                 */}
      {/* ========================================================================= */}
      <div
        style={{
          position: 'fixed',
          bottom: '24px',
          left: '24px',
          zIndex: 99999,
        }}
        className="select-none pointer-events-auto font-sans"
      >
        <div className="relative">
          {/* Ambient Glowing Pulse Ring for Instant Self-Recognition */}
          <span className="absolute -inset-1 rounded-full bg-red-500/30 animate-ping pointer-events-none" />
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            style={{
              backgroundColor: '#ef4444',
              color: '#ffffff',
              width: '60px',
              height: '60px',
              borderRadius: '50%',
            }}
            className="relative flex flex-col items-center justify-center text-white shadow-[0_0_25px_rgba(239,68,68,0.5)] hover:scale-105 active:scale-95 transition-all duration-150 cursor-pointer border-2 border-white focus:outline-none ring-4 ring-red-500/30"
            title="Self Code Feature Analyzer: Programmatic inspection of wired vs dead code"
          >
            <Bug className="w-4 h-4 mb-0.5 text-white" />
            <span className="text-[9px] font-black uppercase tracking-tight leading-none text-white drop-shadow">
              Self code
            </span>

            {/* Live Counter Badge at top-right edge of button */}
            <span
              className="absolute -top-1.5 -right-1.5 min-w-[22px] h-[22px] px-1 rounded-full bg-black text-white font-mono text-[10px] font-black border-2 border-white flex items-center justify-center shadow-lg"
              title={`${deadCount} mock/dead features detected`}
            >
              {deadCount}
            </span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. DIAGNOSTIC REPORT PANEL (SLIDE-OVER DRAWER FROM LEFT)                  */}
      {/* ========================================================================= */}
      {isOpen && (
        <div className="fixed inset-0 z-[100000] flex justify-start font-sans animate-in fade-in duration-150">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-xs cursor-pointer"
            onClick={() => setIsOpen(false)}
          />

          {/* Slide-out Drawer Panel from Left */}
          <div className="relative w-full max-w-xl h-full bg-[#121214] border-r border-[#27272a] shadow-2xl flex flex-col text-zinc-100 z-10 animate-in slide-in-from-left duration-200 select-none">
            {/* 1. Header with Title, Metrics, Run Scan Button */}
            <div className="p-4 border-b border-[#27272a] bg-[#18181b] flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-[#ef4444]/20 border border-[#ef4444]/40 flex items-center justify-center text-[#ef4444]">
                    <Bug className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-[#ededed] flex items-center gap-2">
                      Self Code Feature Audit
                      <span className="px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-300 border border-[#27272a] font-mono text-[10px]">
                        v2.0
                      </span>
                    </h2>
                    <p className="text-[11px] text-zinc-400">
                      Automated runtime crawler inspecting wired vs mock/dead code
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Metrics Bar & "Run Full Scan" CTA */}
              <div className="flex items-center justify-between bg-[#121214] border border-[#27272a] rounded-xl p-2.5">
                <div className="flex items-center gap-3 text-xs font-medium">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-emerald-400 font-bold">{activeCount}</span>
                    <span className="text-zinc-400 text-[11px]">Active</span>
                  </div>
                  <span className="text-zinc-700">|</span>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#ef4444]" />
                    <span className="text-red-400 font-bold">{deadCount}</span>
                    <span className="text-zinc-400 text-[11px]">Dead/Mock</span>
                  </div>
                  <span className="text-zinc-700">|</span>
                  <div className="text-[11px] text-zinc-400">
                    Total: <span className="font-mono text-zinc-200">{totalCount}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={executeScan}
                  disabled={isScanning}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#18181b] hover:bg-[#27272a] text-zinc-200 hover:text-white text-xs font-semibold border border-[#27272a] hover:border-zinc-500 transition cursor-pointer"
                  title="Re-run programmatic inspection checks"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-zinc-300 ${isScanning ? 'animate-spin' : ''}`} />
                  <span>{isScanning ? 'Scanning...' : 'Run Full Scan'}</span>
                </button>
              </div>

              {/* Live App State & Diagnostics Inspector Grid */}
              <div className="grid grid-cols-4 gap-2 bg-[#09090b] border border-[#27272a] rounded-xl p-2.5 text-[10px] font-mono">
                <div className="flex flex-col">
                  <span className="text-zinc-500 uppercase tracking-tighter text-[9px]">Media Bin</span>
                  <span className="text-white font-bold">{assets.length} Assets</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-zinc-500 uppercase tracking-tighter text-[9px]">Timeline</span>
                  <span className="text-white font-bold">{timeline.clips.length} Clips</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-zinc-500 uppercase tracking-tighter text-[9px]">Ratio</span>
                  <span className="text-white font-bold">{timeline.aspectRatio || '9:16'}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-zinc-500 uppercase tracking-tighter text-[9px]">Playhead</span>
                  <span className="text-white font-bold">{currentTime.toFixed(1)}s / {timeline.totalDuration}s</span>
                </div>
              </div>
            </div>

            {/* 2. Filter Chips & Quick Search */}
            <div className="px-4 py-2.5 border-b border-[#27272a] bg-[#121214] flex flex-col gap-2">
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                {MODULE_OPTIONS.map((mod) => (
                  <button
                    key={mod}
                    type="button"
                    onClick={() => setActiveFilter(mod)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition cursor-pointer flex-shrink-0 ${
                      activeFilter === mod
                        ? mod === 'Dead Only'
                          ? 'bg-red-500/20 text-red-300 border border-red-500/40 font-bold'
                          : 'bg-zinc-800 text-white border border-zinc-700 font-bold'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                    }`}
                  >
                    {mod}
                  </button>
                ))}
              </div>

              <div className="relative">
                <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter features by name, target state, or hook..."
                  className="w-full bg-[#18181b] border border-[#27272a] rounded-lg pl-8 pr-3 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500"
                />
              </div>
            </div>

            {/* 3. Grouped Audit List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {filteredItems.length === 0 ? (
                <div className="h-44 flex flex-col items-center justify-center text-center p-6 border border-dashed border-[#27272a] rounded-xl text-zinc-500">
                  <Filter className="w-8 h-8 mb-2 opacity-40 text-zinc-500" />
                  <p className="text-xs font-medium text-zinc-300">No matching features found</p>
                  <p className="text-[11px] text-zinc-500 mt-1">Try resetting the filter or search query</p>
                </div>
              ) : (
                filteredItems.map((item: AuditItemResult) => {
                  const isDead = item.status === 'DEAD';

                  return (
                    <div
                      key={item.id}
                      className={`p-3.5 rounded-xl border transition flex flex-col gap-2 shadow-xs ${
                        isDead
                          ? 'bg-[#18181b] border-[#27272a] hover:border-red-500/40'
                          : 'bg-[#18181b] border-[#27272a] hover:border-emerald-500/30'
                      }`}
                    >
                      {/* Top status header */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            {isDead ? (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-red-500/20 text-red-400 border border-red-500/30 flex items-center gap-1">
                                <XCircle className="w-2.5 h-2.5" /> DEAD
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                                <CheckCircle2 className="w-2.5 h-2.5" /> PASS
                              </span>
                            )}
                            <span className="text-xs font-bold text-[#ededed]">{item.label}</span>
                          </div>

                          <div className="flex items-center gap-2 text-[10px] text-zinc-400 font-mono">
                            <span className="text-zinc-500 uppercase">{item.module}</span>
                            <span>•</span>
                            <span className="text-zinc-400">{item.componentFile}</span>
                            {item.locationLine && (
                              <>
                                <span>•</span>
                                <span className="text-zinc-500">{item.locationLine}</span>
                              </>
                            )}
                          </div>
                        </div>

                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#121214] border border-[#27272a] text-zinc-400 truncate max-w-[160px]">
                          {item.targetHookOrState}
                        </span>
                      </div>

                      {/* Description */}
                      <p className="text-[11px] text-zinc-300 leading-relaxed">
                        {item.description}
                      </p>

                      {/* Unwired code snippet if dead */}
                      {isDead && item.unwiredSnippet && (
                        <div className="bg-[#0d0d0e] border border-[#27272a] rounded-lg p-2 font-mono text-[10px] text-red-300/80 overflow-x-auto">
                          <code>{item.unwiredSnippet}</code>
                        </div>
                      )}

                      {/* Issues list if dead */}
                      {isDead && item.issues.length > 0 && (
                        <div className="space-y-1 bg-red-500/5 border border-red-500/15 rounded-lg p-2 text-[11px] text-red-400">
                          {item.issues.map((iss, i) => (
                            <div key={i} className="flex items-start gap-1.5 leading-tight">
                              <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-0.5 text-red-400" />
                              <span>{iss}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Fix recommendation */}
                      <div className="text-[11px] text-zinc-400 flex items-start gap-1.5 pt-1 border-t border-[#27272a]/60">
                        <Zap className={`w-3.5 h-3.5 flex-shrink-0 mt-0.5 ${isDead ? 'text-amber-400' : 'text-emerald-400'}`} />
                        <span>{item.fixRecommendation}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* 4. Footer with "Copy Dead Code Report" Button */}
            <div className="p-4 border-t border-[#27272a] bg-[#18181b] flex items-center justify-between gap-3">
              <div className="text-[11px] text-zinc-400">
                <span>{filteredItems.length} features listed</span>
                <span className="text-zinc-600 mx-1.5">•</span>
                <span className="text-red-400 font-semibold">{deadCount} dead items</span>
              </div>

              <button
                type="button"
                onClick={handleCopyReport}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold border border-zinc-700 shadow-md transition cursor-pointer active:scale-95"
                title="Copy markdown report of dead and unhandled features to clipboard"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Report Copied!</span>
                  </>
                ) : (
                  <>
                    <Clipboard className="w-3.5 h-3.5 text-zinc-300" />
                    <span>Copy Dead Code Report</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
