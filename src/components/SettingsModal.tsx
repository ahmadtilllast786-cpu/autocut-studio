'use client';

import React, { useState } from 'react';
import { X, Sparkles, Key, Mic, Volume2, Monitor, Check } from 'lucide-react';

export interface AppSettings {
  provider: 'smart-director' | 'gemini' | 'openai';
  geminiKey: string;
  geminiModel: string;
  openaiKey: string;
  openaiModel: string;
  whisperKey: string;
  duckingDb: number;
  exportResolution: '1080x1920' | '720x1280';
}

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSave: (newSettings: AppSettings) => void;
}

export function SettingsModal({ isOpen, onClose, settings, onSave }: SettingsModalProps) {
  const [formData, setFormData] = useState<AppSettings>({ ...settings });
  const [savedToast, setSavedToast] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(formData);
    setSavedToast(true);
    setTimeout(() => {
      setSavedToast(false);
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-[#121214] border border-[#27272a] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden text-zinc-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#27272a]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#18181b] border border-[#27272a] flex items-center justify-center text-zinc-300">
              <Sparkles className="w-4 h-4 text-zinc-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[#ededed]">AutoCut Studio Settings</h2>
              <p className="text-xs text-zinc-400">Configure AI Director, speech engine, and audio levels</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-[#18181b] transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* AI Director Provider */}
          <div className="space-y-3">
            <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
              <Key className="w-3.5 h-3.5 text-zinc-400" />
              AI Director Engine Provider
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'smart-director', name: 'Smart AI (Built-in)', desc: 'Instant & No API Key' },
                { id: 'gemini', name: 'Google Gemini', desc: 'gemini-2.5-flash' },
                { id: 'openai', name: 'OpenAI GPT-4o', desc: 'gpt-4o-mini' },
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setFormData({ ...formData, provider: p.id as AppSettings['provider'] })}
                  className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                    formData.provider === p.id
                      ? 'border-zinc-400 bg-zinc-800/60 text-white shadow-sm'
                      : 'border-[#27272a] bg-[#18181b] hover:bg-[#27272a]/50 text-zinc-400'
                  }`}
                >
                  <span className="text-xs font-bold leading-snug">{p.name}</span>
                  <span className="text-[10px] text-zinc-500 mt-1">{p.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Gemini Settings */}
          {formData.provider === 'gemini' && (
            <div className="p-4 rounded-xl bg-[#18181b] border border-[#27272a] space-y-3">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Google Gemini API Key
                </label>
                <input
                  type="password"
                  value={formData.geminiKey}
                  onChange={(e) => setFormData({ ...formData, geminiKey: e.target.value })}
                  placeholder="AIzaSy..."
                  className="w-full bg-[#121214] border border-[#27272a] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-zinc-500 font-mono"
                />
                <p className="text-[11px] text-zinc-500 mt-1">
                  Your key is stored locally in your browser and used strictly for timeline generation.
                </p>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Gemini Model</label>
                <select
                  value={formData.geminiModel}
                  onChange={(e) => setFormData({ ...formData, geminiModel: e.target.value })}
                  className="w-full bg-[#121214] border border-[#27272a] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-zinc-500"
                >
                  <option value="gemini-2.5-flash">gemini-2.5-flash (Fast & Structured)</option>
                  <option value="gemini-2.5-pro">gemini-2.5-pro (Deep Reasoning)</option>
                </select>
              </div>
            </div>
          )}

          {/* OpenAI Settings */}
          {formData.provider === 'openai' && (
            <div className="p-4 rounded-xl bg-[#18181b] border border-[#27272a] space-y-3">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  OpenAI API Key
                </label>
                <input
                  type="password"
                  value={formData.openaiKey}
                  onChange={(e) => setFormData({ ...formData, openaiKey: e.target.value })}
                  placeholder="sk-proj-..."
                  className="w-full bg-[#121214] border border-[#27272a] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-zinc-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">OpenAI Model</label>
                <select
                  value={formData.openaiModel}
                  onChange={(e) => setFormData({ ...formData, openaiModel: e.target.value })}
                  className="w-full bg-[#121214] border border-[#27272a] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-zinc-500"
                >
                  <option value="gpt-4o-mini">gpt-4o-mini (Optimal for Video Timelines)</option>
                  <option value="gpt-4o">gpt-4o (Full Flagship)</option>
                </select>
              </div>
            </div>
          )}

          {/* Whisper API Settings */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
              <Mic className="w-3.5 h-3.5 text-zinc-400" />
              Whisper Speech-to-Text Key (Optional)
            </label>
            <input
              type="password"
              value={formData.whisperKey}
              onChange={(e) => setFormData({ ...formData, whisperKey: e.target.value })}
              placeholder="Leave blank to use pre-synced word timestamps & local transcript generator"
              className="w-full bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-zinc-500 font-mono"
            />
            <p className="text-[11px] text-zinc-500">
              When uploading custom voiceovers, Whisper extracts exact word-by-word timestamps for auto-captions.
            </p>
          </div>

          {/* Audio Ducking Settings */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                <Volume2 className="w-3.5 h-3.5 text-zinc-400" />
                Background Music Ducking Attenuation
              </label>
              <span className="text-xs font-mono font-semibold text-zinc-200">
                {formData.duckingDb} dB
              </span>
            </div>
            <input
              type="range"
              min={-24}
              max={-8}
              step={1}
              value={formData.duckingDb}
              onChange={(e) => setFormData({ ...formData, duckingDb: Number(e.target.value) })}
              className="w-full accent-zinc-300 bg-[#27272a] h-1.5 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-zinc-500">
              <span>Subtle (-8 dB)</span>
              <span>Standard Voiceover (-16 dB)</span>
              <span>Extreme (-24 dB)</span>
            </div>
          </div>

          {/* Export Resolution */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
              <Monitor className="w-3.5 h-3.5 text-zinc-400" />
              Default Video Render Resolution (9:16)
            </label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { id: '1080x1920', label: '1080x1920 (Full HD)', sub: 'Crystal clear vertical TikTok/Reels' },
                { id: '720x1280', label: '720x1280 (Fast)', sub: 'Fast rendering, lightweight file' },
              ].map((res) => (
                <button
                  key={res.id}
                  type="button"
                  onClick={() => setFormData({ ...formData, exportResolution: res.id as AppSettings['exportResolution'] })}
                  className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                    formData.exportResolution === res.id
                      ? 'border-zinc-400 bg-zinc-800/60 text-white'
                      : 'border-[#27272a] bg-[#18181b] hover:bg-[#27272a]/50 text-zinc-400'
                  }`}
                >
                  <div className="text-xs font-bold">{res.label}</div>
                  <div className="text-[10px] text-zinc-500 mt-0.5">{res.sub}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#27272a] bg-[#18181b] flex items-center justify-between">
          <span className="text-xs text-zinc-500">Changes apply to subsequent AI generation</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-zinc-400 hover:text-white rounded-lg transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-[#ededed] bg-[#27272a] hover:bg-[#3f3f46] border border-[#3f3f46] rounded-lg transition cursor-pointer"
            >
              {savedToast ? (
                <>
                  <Check className="w-3.5 h-3.5 text-zinc-300" />
                  <span>Saved!</span>
                </>
              ) : (
                <span>Save Settings</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
