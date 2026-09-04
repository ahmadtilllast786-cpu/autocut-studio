'use client';

import React, { useState } from 'react';
import { SubtitleSegment, WordTimestamp, SubtitleStyleType } from '@/types/timeline';
import {
  splitSegmentAtWordIndex,
  mergeAdjacentSegments,
  paginateWordsWithRemotion,
  normalizeToStrictWords,
  CaptionPagingMode,
} from '@/lib/captionEngine';
import {
  Edit3,
  Scissors,
  Merge,
  Palette,
  Clock,
  Check,
  RotateCcw,
  Sparkles,
  Layers,
  ChevronRight,
  Play,
} from 'lucide-react';

interface CaptionEditorDrawerProps {
  subtitles: SubtitleSegment[];
  currentTime: number;
  onUpdateSubtitles: (newSubtitles: SubtitleSegment[]) => void;
  onSeek: (time: number) => void;
  activeStyle: SubtitleStyleType;
}

const HIGHLIGHT_COLORS = [
  { name: 'Default', value: '' },
  { name: 'Neon Yellow', value: '#facc15' },
  { name: 'Hormozi Green', value: '#22c55e' },
  { name: 'Alert Red', value: '#ef4444' },
  { name: 'Cyber Cyan', value: '#06b6d4' },
  { name: 'Pure White', value: '#ffffff' },
];

export function CaptionEditorDrawer({
  subtitles,
  currentTime,
  onUpdateSubtitles,
  onSeek,
  activeStyle,
}: CaptionEditorDrawerProps) {
  const [editingWordRef, setEditingWordRef] = useState<{
    segmentId: string;
    wordIndex: number;
  } | null>(null);

  const [editWordText, setEditWordText] = useState('');
  const [editStartMs, setEditStartMs] = useState(0);
  const [editEndMs, setEditEndMs] = useState(0);
  const [pagingMode, setPagingMode] = useState<CaptionPagingMode>('1-to-3-bursts');

  const handleStartEditWord = (seg: SubtitleSegment, wIndex: number) => {
    const w = seg.words[wIndex];
    setEditingWordRef({ segmentId: seg.id, wordIndex: wIndex });
    setEditWordText(w.word);
    setEditStartMs(Math.round((w.startMs ?? w.start * 1000)));
    setEditEndMs(Math.round((w.endMs ?? w.end * 1000)));
    onSeek(w.start);
  };

  const handleSaveWordEdit = () => {
    if (!editingWordRef) return;
    const { segmentId, wordIndex } = editingWordRef;

    const updated = subtitles.map((seg) => {
      if (seg.id !== segmentId) return seg;
      const updatedWords = [...seg.words];
      const prevWord = updatedWords[wordIndex];

      updatedWords[wordIndex] = {
        ...prevWord,
        word: editWordText.trim() || prevWord.word,
        start: Number((editStartMs / 1000).toFixed(3)),
        end: Number((editEndMs / 1000).toFixed(3)),
        startMs: editStartMs,
        endMs: editEndMs,
      };

      const updatedText = updatedWords.map((w) => w.word).join(' ');
      return {
        ...seg,
        text: updatedText,
        startTime: updatedWords[0].start,
        endTime: updatedWords[updatedWords.length - 1].end,
        words: updatedWords,
      };
    });

    onUpdateSubtitles(updated);
    setEditingWordRef(null);
  };

  const handleApplyColor = (color: string) => {
    if (!editingWordRef) return;
    const { segmentId, wordIndex } = editingWordRef;

    const updated = subtitles.map((seg) => {
      if (seg.id !== segmentId) return seg;
      const updatedWords = [...seg.words];
      updatedWords[wordIndex] = {
        ...updatedWords[wordIndex],
        color: color || undefined,
      };
      return { ...seg, words: updatedWords };
    });

    onUpdateSubtitles(updated);
  };

  const handleSplitSegment = (segment: SubtitleSegment, wordIndex: number) => {
    const splitResult = splitSegmentAtWordIndex(segment, wordIndex);
    if (!splitResult) return;

    const segIndex = subtitles.findIndex((s) => s.id === segment.id);
    if (segIndex === -1) return;

    const newSubtitles = [
      ...subtitles.slice(0, segIndex),
      splitResult[0],
      splitResult[1],
      ...subtitles.slice(segIndex + 1),
    ];
    onUpdateSubtitles(newSubtitles);
    setEditingWordRef(null);
  };

  const handleMergeNext = (segIndex: number) => {
    if (segIndex >= subtitles.length - 1) return;
    const merged = mergeAdjacentSegments(subtitles[segIndex], subtitles[segIndex + 1]);

    const newSubtitles = [
      ...subtitles.slice(0, segIndex),
      merged,
      ...subtitles.slice(segIndex + 2),
    ];
    onUpdateSubtitles(newSubtitles);
    setEditingWordRef(null);
  };

  const handleRepaginate = (newMode: CaptionPagingMode) => {
    setPagingMode(newMode);
    // Extract all words from current segments
    const allWords = subtitles.flatMap((s) => s.words);
    const strictWords = normalizeToStrictWords(allWords);
    const repaginated = paginateWordsWithRemotion(strictWords, newMode, activeStyle);
    onUpdateSubtitles(repaginated);
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950/70 border border-zinc-800/80 rounded-xl overflow-hidden text-zinc-200">
      {/* Drawer Header */}
      <div className="p-3.5 bg-zinc-900/80 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Edit3 className="w-4 h-4 text-indigo-400" />
          <h3 className="text-xs font-bold text-white">Transcript & Word Editor</h3>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">
            {subtitles.length} Segments
          </span>
        </div>

        {/* Paging Mode Toggle */}
        <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-lg border border-zinc-800">
          <button
            type="button"
            onClick={() => handleRepaginate('1-to-3-bursts')}
            className={`px-2 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
              pagingMode === '1-to-3-bursts'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
            title="1-3 word punchy bursts (TikTok / CapCut style)"
          >
            ⚡ 1-3 Bursts
          </button>
          <button
            type="button"
            onClick={() => handleRepaginate('spoken-sentences')}
            className={`px-2 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
              pagingMode === 'spoken-sentences'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
            title="Full sentence line blocks"
          >
            📜 Sentences
          </button>
        </div>
      </div>

      {/* Active Word Quick Edit Sub-Panel (When a word is clicked) */}
      {editingWordRef && (
        <div className="p-3 bg-zinc-900/95 border-b border-indigo-500/30 space-y-2 animate-in slide-in-from-top-2">
          <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-300">
            <span>Word Properties</span>
            <button
              type="button"
              onClick={() => setEditingWordRef(null)}
              className="text-zinc-400 hover:text-white"
            >
              ✕
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {/* Word Text Input */}
            <div>
              <label className="text-[10px] text-zinc-400 block mb-1">Text / Spelling</label>
              <input
                type="text"
                value={editWordText}
                onChange={(e) => setEditWordText(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-700 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-indigo-500 font-bold"
              />
            </div>

            {/* Start Milliseconds */}
            <div>
              <label className="text-[10px] text-zinc-400 block mb-1">Start (ms)</label>
              <input
                type="number"
                step={50}
                value={editStartMs}
                onChange={(e) => setEditStartMs(Number(e.target.value))}
                className="w-full bg-zinc-950 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-200 font-mono focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* End Milliseconds */}
            <div>
              <label className="text-[10px] text-zinc-400 block mb-1">End (ms)</label>
              <input
                type="number"
                step={50}
                value={editEndMs}
                onChange={(e) => setEditEndMs(Number(e.target.value))}
                className="w-full bg-zinc-950 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-200 font-mono focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Color Accent Chips */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-zinc-400 mr-1 flex items-center gap-1">
                <Palette className="w-3 h-3" /> Color:
              </span>
              {HIGHLIGHT_COLORS.map((c) => (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => handleApplyColor(c.value)}
                  className="w-4 h-4 rounded-full border border-zinc-600 hover:scale-125 transition cursor-pointer shadow-sm"
                  style={{ backgroundColor: c.value || '#3f3f46' }}
                  title={c.name}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={handleSaveWordEdit}
              className="flex items-center gap-1 px-3 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow-sm cursor-pointer"
            >
              <Check className="w-3 h-3" /> Save Word
            </button>
          </div>
        </div>
      )}

      {/* Segment List Scroll Area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {subtitles.map((seg, segIdx) => {
          const isSegmentActive =
            currentTime >= seg.startTime && currentTime <= seg.endTime;

          return (
            <div
              key={seg.id}
              className={`p-2.5 rounded-xl border transition ${
                isSegmentActive
                  ? 'border-indigo-500/70 bg-indigo-500/10'
                  : 'border-zinc-800/80 bg-zinc-900/50 hover:bg-zinc-900/90'
              }`}
            >
              {/* Segment Meta Bar */}
              <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 mb-1.5">
                <button
                  type="button"
                  onClick={() => onSeek(seg.startTime)}
                  className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 font-bold cursor-pointer"
                  title="Jump playhead to segment"
                >
                  <Play className="w-2.5 h-2.5" />
                  <span>{seg.startTime.toFixed(2)}s – {seg.endTime.toFixed(2)}s</span>
                </button>

                <div className="flex items-center gap-1">
                  {segIdx < subtitles.length - 1 && (
                    <button
                      type="button"
                      onClick={() => handleMergeNext(segIdx)}
                      className="px-1.5 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 flex items-center gap-1 transition cursor-pointer"
                      title="Merge this segment with next"
                    >
                      <Merge className="w-2.5 h-2.5" />
                      <span>Merge</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Clickable Word Chips */}
              <div className="flex flex-wrap items-center gap-1.5">
                {seg.words.map((w, wIdx) => {
                  const isWordPlaying = currentTime >= w.start && currentTime <= w.end;
                  const isWordSelected =
                    editingWordRef?.segmentId === seg.id &&
                    editingWordRef?.wordIndex === wIdx;

                  return (
                    <div key={wIdx} className="group relative flex items-center">
                      <button
                        type="button"
                        onClick={() => handleStartEditWord(seg, wIdx)}
                        style={{ color: w.color }}
                        className={`px-2 py-1 rounded-md text-xs font-bold transition cursor-pointer ${
                          isWordSelected
                            ? 'ring-2 ring-indigo-400 bg-indigo-600/30 text-white'
                            : isWordPlaying
                            ? 'bg-yellow-400 text-black font-black scale-105'
                            : 'bg-zinc-800/90 text-zinc-200 hover:bg-zinc-700'
                        }`}
                        title={`Click to edit: "${w.word}" (${w.start}s - ${w.end}s)`}
                      >
                        {w.word}
                      </button>

                      {/* Split Button between words */}
                      {wIdx > 0 && (
                        <button
                          type="button"
                          onClick={() => handleSplitSegment(seg, wIdx)}
                          className="opacity-0 group-hover:opacity-100 absolute -left-2 text-[8px] bg-indigo-600 hover:bg-indigo-500 text-white p-0.5 rounded-full z-10 transition cursor-pointer shadow"
                          title="Split into new line here"
                        >
                          <Scissors className="w-2 h-2" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
