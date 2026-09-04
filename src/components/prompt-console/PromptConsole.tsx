'use client';

import React, { useState } from 'react';
import { MediaAsset, Timeline } from '@/types/timeline';
import { generateTimeline } from '@/lib/aiDirector';
import { AppSettings } from '../SettingsModal';
import { SystemPromptModal } from './SystemPromptModal';
import { Sparkles, Wand2, Sliders, FileText, CheckCircle2, AlertCircle } from 'lucide-react';

interface PromptConsoleProps {
  assets: MediaAsset[];
  currentTimeline: Timeline | null;
  onTimelineGenerated: (timeline: Timeline) => void;
  settings: AppSettings;
}

const PRESET_PROMPTS = [
  {
    id: 'viral-mrbeast',
    title: '⚡ Viral Hooks & Fast Cuts (MrBeast Style)',
    pacing: 'viral-fast' as const,
    prompt:
      'Create an intense, fast-paced 60-second vertical video. Start with VID_01 for the high-energy visual hook. Snap quickly into IMG_01 with a Ken Burns zoom-in motion. Transition dynamically using whip pans and zoom snaps through VID_02 and VID_03. Auto-duck background music during voiceover speech, and apply high-contrast cyber grading with glitch cuts near the climax.',
  },
  {
    id: 'cinematic-vlog',
    title: '🎬 Cinematic Aesthetic Montage',
    pacing: 'cinematic-slow' as const,
    prompt:
      'Produce an aesthetic, cinematic 60-second vertical montage. Open with VID_02 drone view, smoothly cross-dissolve to IMG_02 workspace with a gentle slow pan left. Apply warm-vintage grading across clips. Keep transitions cinematic and ensure BG_MUSIC ducks smoothly under VO_TRACK narration.',
  },
  {
    id: 'cyber-tech',
    title: '🚀 Cyberpunk Tech Reel',
    pacing: 'viral-fast' as const,
    prompt:
      'Build a futuristic tech reel totaling 60 seconds. Feature VID_04 neon movement, zoom-snap into IMG_01 AI interface and IMG_03 banner with pulse motion. Use cyber neon grading, glitch transitions, and punchy word-by-word highlighted captions.',
  },
  {
    id: 'narrative-story',
    title: '🎙️ High-Retention Storyteller',
    pacing: 'balanced' as const,
    prompt:
      'Pace this 60s video for peak viewer retention. Synchronize cuts with the VO_TRACK speech intervals. Attenuate BG_MUSIC by -16 dB during speech. Feature VID_01, VID_03, and IMG_02 with balanced pacing, clean transitions, and crisp subtitle styling.',
  },
];

export function PromptConsole({
  assets,
  currentTimeline,
  onTimelineGenerated,
  settings,
}: PromptConsoleProps) {
  const [prompt, setPrompt] = useState(PRESET_PROMPTS[0].prompt);
  const [pacing, setPacing] = useState<'viral-fast' | 'balanced' | 'cinematic-slow'>('viral-fast');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showSystemPromptModal, setShowSystemPromptModal] = useState(false);

  const handleSelectPreset = (preset: typeof PRESET_PROMPTS[0]) => {
    setPrompt(preset.prompt);
    setPacing(preset.pacing);
    setErrorMsg(null);
  };

  const handleInsertTag = (tag: string) => {
    setPrompt((prev) => `${prev.trim()} ${tag}`);
  };

  const handleGenerate = async () => {
    if (assets.length === 0) {
      setErrorMsg('Please upload or load sample assets in the Media Bin before generating.');
      return;
    }
    if (!prompt.trim()) {
      setErrorMsg('Please enter your video editing instructions.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const result = await generateTimeline({
        userPrompt: prompt,
        assets,
        pacing,
        provider: settings.provider,
        apiKey:
          settings.provider === 'gemini'
            ? settings.geminiKey
            : settings.provider === 'openai'
            ? settings.openaiKey
            : undefined,
        model:
          settings.provider === 'gemini'
            ? settings.geminiModel
            : settings.provider === 'openai'
            ? settings.openaiModel
            : undefined,
      });

      onTimelineGenerated(result);
    } catch (err: unknown) {
      console.error('Timeline generation error:', err);
      setErrorMsg(err instanceof Error ? err.message : 'Failed to generate timeline.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950/40 p-4 overflow-y-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wand2 className="w-4 h-4 text-fuchsia-400" />
          <h2 className="text-sm font-bold text-white tracking-wide">
            AI Director & Natural Language Script
          </h2>
        </div>
        <button
          type="button"
          onClick={() => setShowSystemPromptModal(true)}
          className="text-[11px] text-zinc-400 hover:text-white flex items-center gap-1 px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition cursor-pointer"
          title="Inspect System Prompt and schema instructions"
        >
          <FileText className="w-3 h-3 text-indigo-400" />
          <span>System Prompt</span>
        </button>
      </div>

      {/* Preset Buttons Carousel / Grid */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
          Quick Preset Blueprints
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {PRESET_PROMPTS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => handleSelectPreset(preset)}
              className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between group ${
                prompt === preset.prompt
                  ? 'border-indigo-500 bg-indigo-500/10 text-white'
                  : 'border-zinc-800/80 bg-zinc-900/50 hover:bg-zinc-800/60 text-zinc-300'
              }`}
            >
              <div className="text-xs font-bold truncate group-hover:text-white">
                {preset.title}
              </div>
              <div className="text-[10px] text-zinc-500 mt-1 capitalize">
                Pacing: {preset.pacing.replace('-', ' ')}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Script & Prompt Input */}
      <div className="space-y-1.5 flex-1 flex flex-col">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
            Natural-Language Editing Instructions
          </label>
          <span className="text-[10px] text-zinc-500 font-mono">
            {prompt.length} chars
          </span>
        </div>

        <div className="relative flex-1 min-h-[140px]">
          <textarea
            value={prompt}
            onChange={(e) => {
              setPrompt(e.target.value);
              if (errorMsg) setErrorMsg(null);
            }}
            placeholder="e.g., Sequence VID_01 for the hook, zoom into IMG_01 with Ken Burns, cross-dissolve to VID_02, auto-duck background music during voiceover..."
            className="w-full h-full min-h-[140px] bg-zinc-900/90 border border-zinc-800 rounded-xl p-3.5 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-y leading-relaxed font-sans"
          />
        </div>

        {/* Quick Tag Insert Helper */}
        {assets.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap pt-1">
            <span className="text-[10px] text-zinc-500 font-medium">Click to insert code:</span>
            {assets.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => handleInsertTag(a.id)}
                className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 hover:border-zinc-700 transition cursor-pointer"
              >
                +{a.id}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Pacing & Target Duration Controls */}
      <div className="p-3 rounded-xl bg-zinc-900/70 border border-zinc-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-indigo-400" />
          <div>
            <div className="text-xs font-bold text-zinc-200">Editing Pacing Style</div>
            <div className="text-[10px] text-zinc-500">Controls cut frequency and clip durations</div>
          </div>
        </div>

        <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-lg border border-zinc-800">
          {[
            { id: 'viral-fast', label: 'Viral Fast (3-5s)' },
            { id: 'balanced', label: 'Balanced (5-7s)' },
            { id: 'cinematic-slow', label: 'Cinematic (7-10s)' },
          ].map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPacing(p.id as typeof pacing)}
              className={`px-2.5 py-1 rounded text-[11px] font-medium transition cursor-pointer ${
                pacing === p.id
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Error Message */}
      {errorMsg && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Primary Generate CTA */}
      <button
        type="button"
        onClick={handleGenerate}
        disabled={isLoading || assets.length === 0}
        className={`w-full py-3.5 px-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-xl transition cursor-pointer ${
          isLoading
            ? 'bg-zinc-800 text-zinc-400 cursor-wait'
            : 'bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 hover:opacity-95 text-white shadow-indigo-600/20 active:scale-[0.99]'
        }`}
      >
        {isLoading ? (
          <>
            <div className="w-4 h-4 border-2 border-zinc-400 border-t-white rounded-full animate-spin" />
            <span>AI Director is Synthesizing 60s Timeline...</span>
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>Generate 60-Second Video Edit</span>
          </>
        )}
      </button>

      {/* Current Timeline Director Summary */}
      {currentTimeline && (
        <div className="p-3 rounded-xl bg-zinc-900/50 border border-zinc-800 text-xs text-zinc-400 space-y-1">
          <div className="flex items-center gap-1.5 text-zinc-300 font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Active Edit: {currentTimeline.clips.length} Clips (60.0s)</span>
          </div>
          {currentTimeline.directorNotes && (
            <p className="text-[11px] text-zinc-500 line-clamp-2">
              {currentTimeline.directorNotes}
            </p>
          )}
        </div>
      )}

      {/* System Prompt Modal */}
      <SystemPromptModal
        isOpen={showSystemPromptModal}
        onClose={() => setShowSystemPromptModal(false)}
      />
    </div>
  );
}
