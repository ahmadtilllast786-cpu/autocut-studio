'use client';

import React, { useState, useMemo } from 'react';
import {
  AlertTriangle,
  Bug,
  Check,
  ChevronRight,
  Clipboard,
  ExternalLink,
  Layers,
  Mic,
  Music,
  Sliders,
  Sparkles,
  Volume2,
  X,
  Zap,
} from 'lucide-react';

export type IssueSeverity = 'Unwired' | 'Placeholder' | 'Partial' | 'Stub';

export interface DeadCodeItem {
  id: string;
  module: 'Media Bin' | 'Player Overlay' | 'Timeline' | 'Audio Engine' | 'Settings';
  title: string;
  componentFile: string;
  locationLine?: string;
  description: string;
  severity: IssueSeverity;
  unwiredCodeSnippet: string;
  fixRecommendation: string;
}

// Built-in comprehensive audit registry of unwired buttons, placeholder tabs, and stubs
export const INITIAL_AUDIT_ITEMS: DeadCodeItem[] = [
  {
    id: 'dc-1',
    module: 'Media Bin',
    title: 'Library tab has no data source attached',
    componentFile: 'src/components/docking/panels/MediaDrawerPanel.tsx',
    locationLine: 'Line 378',
    description: 'The Library tab displays a generic placeholder card without connecting to cloud storage or stock media APIs.',
    severity: 'Placeholder',
    unwiredCodeSnippet: `{!['media', 'transitions', 'filters', 'audio'].includes(activeTab) && <PlaceholderView />}`,
    fixRecommendation: 'Wire to stock media API or public royalty-free asset library catalog.',
  },
  {
    id: 'dc-2',
    module: 'Media Bin',
    title: 'Spaces & Brand Assets categories have no cloud backend',
    componentFile: 'src/components/docking/panels/MediaDrawerPanel.tsx',
    locationLine: 'Line 155',
    description: 'Left drawer category buttons ("Spaces", "Brand Assets") set local activeCategory state but do not switch to team workspaces or custom branding assets.',
    severity: 'Placeholder',
    unwiredCodeSnippet: `onClick={() => setActiveCategory(cat.id)} // only toggles string state`,
    fixRecommendation: 'Connect custom brand kit font/watermark loader and team space sync.',
  },
  {
    id: 'dc-3',
    module: 'Timeline',
    title: 'Record Voiceover button missing MediaRecorder audio pipe',
    componentFile: 'src/components/docking/panels/TimelinePanel.tsx',
    locationLine: 'Line 214',
    description: 'Clicking the Record button toggles a flashing UI state, but getUserMedia() and MediaStreamRecorder are not piped to generate a new VO_TRACK audio asset.',
    severity: 'Unwired',
    unwiredCodeSnippet: `onClick={() => setIsRecording(!isRecording)} // empty state toggle`,
    fixRecommendation: 'Wire browser navigator.mediaDevices.getUserMedia audio recording into VO_TRACK pipeline.',
  },
  {
    id: 'dc-4',
    module: 'Timeline',
    title: 'Ripple Edit mode missing downstream track shift engine',
    componentFile: 'src/components/docking/panels/TimelinePanel.tsx',
    locationLine: 'Line 184',
    description: 'Ripple Edit button toggles boolean state, but clip duration changes do not ripple-shift adjacent clips downstream.',
    severity: 'Unwired',
    unwiredCodeSnippet: `onClick={() => setRippleEdit(!rippleEdit)} // flag not utilized in clip drag`,
    fixRecommendation: 'Implement ripple delta propagation in clip trim and blade split handlers.',
  },
  {
    id: 'dc-5',
    module: 'Timeline',
    title: 'Magnet Snapping lacks magnetic clip boundary physics',
    componentFile: 'src/components/docking/panels/TimelinePanel.tsx',
    locationLine: 'Line 199',
    description: 'Magnet Snapping toggles visual active state, but playhead scrubbing and blade splitting do not magnetically snap within threshold pixels.',
    severity: 'Unwired',
    unwiredCodeSnippet: `onClick={() => setMagnetSnapping(!magnetSnapping)} // boolean not checked on pointer move`,
    fixRecommendation: 'Add threshold snapping logic (playheadSnapThreshold = 0.15s) to scrubber pointer events.',
  },
  {
    id: 'dc-6',
    module: 'Player Overlay',
    title: 'Caption rotation angle not saved to timeline clip state',
    componentFile: 'src/components/captions/DraggableCaptionOverlay.tsx',
    locationLine: 'Line 70',
    description: 'DraggableCaptionOverlay tracks x and y position coordinates, but rotation angle and scale transforms are not persisted to timeline.captionPosition.',
    severity: 'Partial',
    unwiredCodeSnippet: `onPositionChange({ x: newX, y: newY }) // rotation and scale omitted`,
    fixRecommendation: 'Pass rotation and scale properties in onPositionChange and persist to SubtitleSegment.',
  },
  {
    id: 'dc-7',
    module: 'Audio Engine',
    title: 'Ducking slider missing live AudioContext gain node re-bind',
    componentFile: 'src/components/SettingsModal.tsx',
    locationLine: 'Line 115',
    description: 'Export and director settings save ducking dB to state, but live Web Audio gainNode volume does not re-compute on slider drag without restarting playback.',
    severity: 'Partial',
    unwiredCodeSnippet: `bgmGainNode.gain.setValueAtTime(currentGain, audioCtx.currentTime)`,
    fixRecommendation: 'Add direct live audio gain observer to dynamically update active BGM playback gain node.',
  },
];

export function SelfCodeDiagnostic() {
  const [isOpen, setIsOpen] = useState(false);
  const [items, setItems] = useState<DeadCodeItem[]>(INITIAL_AUDIT_ITEMS);
  const [selectedModule, setSelectedModule] = useState<string>('All');
  const [copied, setCopied] = useState(false);

  // Dev Guard: only render in dev, or when NEXT_PUBLIC_ENABLE_SELF_CODE=true
  if (
    process.env.NODE_ENV === 'production' &&
    !process.env.NEXT_PUBLIC_ENABLE_SELF_CODE &&
    typeof window !== 'undefined' &&
    !window.location.search.includes('selfcode=true')
  ) {
    return null;
  }

  const filteredItems = useMemo(() => {
    if (selectedModule === 'All') return items;
    return items.filter((i) => i.module === selectedModule);
  }, [items, selectedModule]);

  const deadCodeCount = items.length;

  const handleCopyReport = () => {
    const reportText = [
      '# 🚨 AutoCut Studio - Dead Code & Unwired Elements Report',
      `*Generated on: ${new Date().toISOString()}*`,
      `*Total Unwired / Dead Items Detected: ${deadCodeCount}*`,
      '',
      '---',
      ...items.map((item, idx) => `
### ${idx + 1}. [${item.severity}] ${item.title}
- **Module**: ${item.module}
- **File**: \`${item.componentFile}\` (${item.locationLine || 'N/A'})
- **Description**: ${item.description}
- **Unwired Snippet**:
\`\`\`ts
${item.unwiredCodeSnippet}
\`\`\`
- **Recommended Fix**: ${item.fixRecommendation}
`),
    ].join('\n');

    navigator.clipboard.writeText(reportText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      {/* 1. FIXED FLOATING RED CIRCLE (Bottom-Right Corner) */}
      <div
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          zIndex: 9999,
        }}
        className="select-none pointer-events-auto"
      >
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          style={{
            backgroundColor: '#ef4444',
            width: '56px',
            height: '56px',
            borderRadius: '50%',
          }}
          className="relative flex flex-col items-center justify-center text-white shadow-2xl shadow-red-500/40 hover:scale-105 active:scale-95 transition-transform cursor-pointer border-2 border-white/20 focus:outline-none"
          title="Self-Code Diagnostic Auditor: Audit unwired buttons and placeholder code"
        >
          <Bug className="w-4 h-4 mb-0.5" />
          <span className="text-[9px] font-black uppercase tracking-tighter leading-none">
            Self code
          </span>

          {/* Counter Badge Chip */}
          <span className="absolute -top-1 -right-1 min-w-[20px] h-[20px] px-1 rounded-full bg-zinc-950 text-white font-mono text-[10px] font-black border-2 border-red-500 flex items-center justify-center shadow-md">
            {deadCodeCount}
          </span>
        </button>
      </div>

      {/* 2. DIAGNOSTIC SLIDE-OVER DRAWER */}
      {isOpen && (
        <div className="fixed inset-0 z-[10000] flex justify-end animate-in fade-in duration-200">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-xs"
            onClick={() => setIsOpen(false)}
          />

          {/* Drawer Content */}
          <div className="relative w-full max-w-md h-full bg-[#121214] border-l border-[#27272a] shadow-2xl flex flex-col text-zinc-100 z-10 animate-in slide-in-from-right duration-250">
            {/* Drawer Header */}
            <div className="p-4 border-b border-[#27272a] bg-[#18181b] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400">
                  <Bug className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white flex items-center gap-2">
                    Self-Code Diagnostic Audit
                    <span className="px-1.5 py-0.2 rounded-full bg-red-500/20 text-red-400 border border-red-500/40 font-mono text-[10px] font-black">
                      {deadCodeCount} Issues
                    </span>
                  </h2>
                  <p className="text-[11px] text-zinc-400">
                    Audits unwired handlers, placeholder tabs, and stubs
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

            {/* Quick Filter Bar */}
            <div className="px-4 py-2 border-b border-[#27272a] bg-[#121214] flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {['All', 'Media Bin', 'Timeline', 'Player Overlay', 'Audio Engine'].map((mod) => (
                <button
                  key={mod}
                  type="button"
                  onClick={() => setSelectedModule(mod)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition cursor-pointer flex-shrink-0 ${
                    selectedModule === mod
                      ? 'bg-zinc-800 text-white border border-zinc-700'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                  }`}
                >
                  {mod}
                </button>
              ))}
            </div>

            {/* List of Detected Dead Code Items */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {filteredItems.map((item) => {
                const badgeColor =
                  item.severity === 'Unwired'
                    ? 'bg-red-500/20 text-red-400 border-red-500/30'
                    : item.severity === 'Placeholder'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                    : 'bg-blue-500/20 text-blue-300 border-blue-500/30';

                return (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-xl bg-[#18181b] border border-[#27272a] hover:border-zinc-700 transition flex flex-col gap-2 shadow-xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white">{item.title}</span>
                        </div>
                        <div className="text-[10px] font-mono text-zinc-400">
                          {item.componentFile} • {item.locationLine}
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${badgeColor}`}>
                        {item.severity}
                      </span>
                    </div>

                    <p className="text-[11px] text-zinc-300 leading-relaxed">
                      {item.description}
                    </p>

                    {/* Unwired Code Snippet */}
                    <div className="bg-[#0d0d0e] border border-[#27272a] rounded-lg p-2 font-mono text-[10px] text-zinc-400 overflow-x-auto">
                      <code>{item.unwiredCodeSnippet}</code>
                    </div>

                    {/* Fix Recommendation */}
                    <div className="text-[11px] text-zinc-400 flex items-start gap-1.5 pt-1 border-t border-[#27272a]/60">
                      <Zap className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                      <span>{item.fixRecommendation}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Drawer Footer Actions */}
            <div className="p-4 border-t border-[#27272a] bg-[#18181b] flex items-center justify-between gap-3">
              <div className="text-[11px] text-zinc-400">
                <span>{filteredItems.length} of {deadCodeCount} items listed</span>
              </div>

              <button
                type="button"
                onClick={handleCopyReport}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold border border-zinc-700 shadow-md transition cursor-pointer"
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
