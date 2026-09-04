'use client';

import React, { useState } from 'react';
import { Timeline, TimelineSchema } from '@/types/timeline';
import { Code2, Copy, Download, Check, ChevronDown, ChevronUp, Edit3, RotateCcw, AlertTriangle } from 'lucide-react';

interface JsonInspectorProps {
  timeline: Timeline;
  onUpdateTimeline?: (updated: Timeline) => void;
}

export function JsonInspector({ timeline, onUpdateTimeline }: JsonInspectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [jsonText, setJsonText] = useState('');
  const [parseError, setParseError] = useState<string | null>(null);

  const formattedJson = JSON.stringify(timeline, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(formattedJson);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleDownload = () => {
    const blob = new Blob([formattedJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `AutoCut_Timeline_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const startEditing = () => {
    setJsonText(formattedJson);
    setParseError(null);
    setIsEditing(true);
  };

  const applyEdits = () => {
    try {
      const parsed = JSON.parse(jsonText);
      const validated = TimelineSchema.parse(parsed);
      onUpdateTimeline?.(validated);
      setIsEditing(false);
      setParseError(null);
    } catch (err: unknown) {
      setParseError(err instanceof Error ? err.message : 'Invalid Timeline JSON.');
    }
  };

  return (
    <div className="border border-zinc-800 rounded-xl bg-zinc-950/70 overflow-hidden text-zinc-300">
      {/* Header Bar */}
      <div className="p-3 bg-zinc-900/60 flex items-center justify-between border-b border-zinc-800/80">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 text-xs font-bold text-zinc-200 hover:text-white transition cursor-pointer"
        >
          <Code2 className="w-4 h-4 text-indigo-400" />
          <span>Timeline JSON Schema Inspector</span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">
            {timeline.clips.length} clips • {timeline.totalDuration}s
          </span>
          {isOpen ? <ChevronUp className="w-3.5 h-3.5 text-zinc-500" /> : <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />}
        </button>

        {isOpen && (
          <div className="flex items-center gap-1.5">
            {!isEditing ? (
              <button
                type="button"
                onClick={startEditing}
                className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition cursor-pointer"
              >
                <Edit3 className="w-3 h-3" />
                <span>Edit JSON</span>
              </button>
            ) : (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-2 py-1 rounded text-[11px] text-zinc-400 hover:text-zinc-200"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={applyEdits}
                  className="flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-bold bg-indigo-600 hover:bg-indigo-500 text-white"
                >
                  Apply Edits
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition cursor-pointer"
              title="Copy JSON"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>

            <button
              type="button"
              onClick={handleDownload}
              className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition cursor-pointer"
              title="Download JSON"
            >
              <Download className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>

      {/* Expandable Inspector Body */}
      {isOpen && (
        <div className="p-3 bg-zinc-950">
          {parseError && (
            <div className="mb-2 p-2 rounded bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{parseError}</span>
            </div>
          )}

          {isEditing ? (
            <textarea
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              rows={12}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-3 text-xs font-mono text-emerald-400 focus:outline-none focus:border-indigo-500 leading-relaxed resize-y"
            />
          ) : (
            <pre className="max-h-72 overflow-y-auto overflow-x-auto text-[11px] font-mono text-indigo-300/90 leading-relaxed bg-zinc-900/50 p-3 rounded-lg border border-zinc-800/80">
              {formattedJson}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
