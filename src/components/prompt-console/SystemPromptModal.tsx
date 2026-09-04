'use client';

import React from 'react';
import { X, Bot, ShieldCheck, Code2 } from 'lucide-react';
import { SYSTEM_PROMPT } from '@/lib/aiDirector';

interface SystemPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SystemPromptModal({ isOpen, onClose }: SystemPromptModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden text-zinc-200 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-950/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                AI Director System Instructions
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Zod Validated
                </span>
              </h2>
              <p className="text-xs text-zinc-400">Core prompt persona and strict timeline synthesis constraints</p>
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

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4">
          <div className="text-xs text-zinc-400 leading-relaxed">
            These system instructions configure the LLM (Gemini, OpenAI, or the built-in Smart Director) to parse your media catalog, enforce exact 60.0-second vertical cut constraints, assign Ken Burns motions, map audio ducking stems, and format valid Zod-checked JSON.
          </div>

          <div className="relative">
            <div className="absolute top-2 right-2 flex items-center gap-1 text-[10px] font-mono text-zinc-500 bg-zinc-900/80 px-2 py-0.5 rounded border border-zinc-800">
              <Code2 className="w-3 h-3" /> System Prompt Preset
            </div>
            <pre className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-xs font-mono text-zinc-300 leading-relaxed overflow-x-auto whitespace-pre-wrap">
              {SYSTEM_PROMPT}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-zinc-800 bg-zinc-950/50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-white bg-zinc-800 hover:bg-zinc-700 rounded-lg transition cursor-pointer"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
}
