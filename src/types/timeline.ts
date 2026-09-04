import { z } from 'zod';

export type AssetType = 'video' | 'image' | 'voiceover' | 'music';

export interface MediaAsset {
  id: string; // e.g., 'VID_01', 'IMG_01', 'VO_TRACK', 'BG_MUSIC'
  type: AssetType;
  name: string;
  url: string;
  duration: number; // in seconds
  width?: number;
  height?: number;
  thumbnailUrl?: string;
  fileSize?: number; // in bytes
}

export type TransitionType =
  | 'none'
  | 'whip-pan'
  | 'cross-dissolve'
  | 'zoom-snap'
  | 'glitch'
  | 'slide-left';

export type MotionEffectType =
  | 'none'
  | 'ken-burns-zoom-in'
  | 'ken-burns-zoom-out'
  | 'pan-left'
  | 'pan-right'
  | 'shake'
  | 'pulse';

export type ColorFilterType =
  | 'none'
  | 'warm-vintage'
  | 'high-contrast'
  | 'noir'
  | 'cyber'
  | 'teal-orange'
  | 'cinematic';

export type SubtitleStyleType =
  | 'viral-highlight'
  | 'minimal-white'
  | 'neon-cyber'
  | 'classic-box';

export interface WordTimestamp {
  word: string;
  start: number; // seconds
  end: number;   // seconds
}

export interface SubtitleSegment {
  id: string;
  text: string;
  startTime: number; // seconds
  endTime: number;   // seconds
  words: WordTimestamp[];
  style?: SubtitleStyleType;
}

export interface TimelineClip {
  id: string;
  assetId: string; // Must match MediaAsset.id
  startTime: number; // in seconds on the timeline
  duration: number; // in seconds
  sourceStart: number; // trim in-point on source asset
  transition: TransitionType;
  transitionDuration?: number; // default 0.4s
  motionEffect: MotionEffectType;
  colorFilter: ColorFilterType;
  volume?: number; // 0 to 1 for video's native audio
}

export interface AudioStemConfig {
  assetId: string;
  volume: number; // 0.0 to 1.0
  ducking?: boolean;
  duckingAttenuationDb?: number; // default -16 dB
  fadeInDuration?: number;
  fadeOutDuration?: number;
}

export interface Timeline {
  title: string;
  totalDuration: number; // default 60 seconds
  fps: number; // default 30
  aspectRatio: '9:16';
  width: number; // 1080
  height: number; // 1920
  clips: TimelineClip[];
  voiceover?: AudioStemConfig;
  backgroundMusic?: AudioStemConfig;
  subtitles: SubtitleSegment[];
  pacing?: 'viral-fast' | 'balanced' | 'cinematic-slow';
  directorNotes?: string;
}

// Zod Schemas for LLM Structured Output Validation
export const WordTimestampSchema = z.object({
  word: z.string(),
  start: z.number().min(0),
  end: z.number().min(0),
});

export const SubtitleSegmentSchema = z.object({
  id: z.string(),
  text: z.string(),
  startTime: z.number().min(0),
  endTime: z.number().min(0),
  words: z.array(WordTimestampSchema),
  style: z.enum(['viral-highlight', 'minimal-white', 'neon-cyber', 'classic-box']).default('viral-highlight'),
});

export const TimelineClipSchema = z.object({
  id: z.string(),
  assetId: z.string(),
  startTime: z.number().min(0),
  duration: z.number().min(0.5),
  sourceStart: z.number().min(0).default(0),
  transition: z.enum(['none', 'whip-pan', 'cross-dissolve', 'zoom-snap', 'glitch', 'slide-left']).default('none'),
  transitionDuration: z.number().min(0.1).max(2).default(0.4),
  motionEffect: z.enum(['none', 'ken-burns-zoom-in', 'ken-burns-zoom-out', 'pan-left', 'pan-right', 'shake', 'pulse']).default('none'),
  colorFilter: z.enum(['none', 'warm-vintage', 'high-contrast', 'noir', 'cyber', 'teal-orange', 'cinematic']).default('none'),
  volume: z.number().min(0).max(1).default(0),
});

export const AudioStemConfigSchema = z.object({
  assetId: z.string(),
  volume: z.number().min(0).max(1).default(1),
  ducking: z.boolean().default(false),
  duckingAttenuationDb: z.number().default(-16),
  fadeInDuration: z.number().min(0).default(0.5),
  fadeOutDuration: z.number().min(0).default(1.0),
});

export const TimelineSchema = z.object({
  title: z.string().default('AutoCut Vertical Edit'),
  totalDuration: z.number().min(5).max(180).default(60),
  fps: z.number().default(30),
  aspectRatio: z.literal('9:16').default('9:16'),
  width: z.number().default(1080),
  height: z.number().default(1920),
  clips: z.array(TimelineClipSchema),
  voiceover: AudioStemConfigSchema.optional(),
  backgroundMusic: AudioStemConfigSchema.optional(),
  subtitles: z.array(SubtitleSegmentSchema).default([]),
  pacing: z.enum(['viral-fast', 'balanced', 'cinematic-slow']).default('viral-fast'),
  directorNotes: z.string().optional(),
});

export type TimelineSchemaType = z.infer<typeof TimelineSchema>;
