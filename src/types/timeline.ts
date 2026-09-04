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

// 4 Programmatic Motion Presets for Short-Form Viral Retention
export type ViralMotionPreset =
  | 'punch_in'
  | 'whip_pan'
  | 'ken_burns_zoom'
  | 'white_flash'
  | 'none';

// Backwards-compatible alias
export type MotionEffectType = ViralMotionPreset;
export type TransitionType = ViralMotionPreset;

export type ColorFilterType =
  | 'none'
  | 'warm-vintage'
  | 'high-contrast'
  | 'noir'
  | 'cyber'
  | 'teal-orange'
  | 'cinematic';

// Strict 3 Short-Form Caption Presets: Bouncy Karaoke, Hormozi, Minimal Clean
export type SubtitleStyleType =
  | 'bouncy-karaoke'
  | 'hormozi'
  | 'minimal-clean'
  | 'hormozi-pop'
  | 'minimal-boxed';

export type AspectRatioType = '9:16' | '16:9' | '1:1';

export interface CaptionPosition {
  x: number; // percentage 5 - 95 (default: 50)
  y: number; // percentage 10 - 85 (safe zone lock, default: 70)
}

export interface WordTimestamp {
  word: string;
  start: number; // seconds
  end: number;   // seconds
  startMs?: number; // milliseconds
  endMs?: number;   // milliseconds
  confidence?: number;
  color?: string; // custom word color override
}

export interface SubtitleSegment {
  id: string;
  text: string;
  startTime: number; // seconds
  endTime: number;   // seconds
  words: WordTimestamp[];
  style?: SubtitleStyleType;
  position?: CaptionPosition;
  scale?: number;
  rotation?: number;
}

export interface TimelineClip {
  id: string;
  assetId: string; // Must match MediaAsset.id
  startTime: number; // in seconds on the timeline
  duration: number; // in seconds (1.8s to 3.0s viral rule)
  sourceStart: number; // trim in-point on source asset
  transition: ViralMotionPreset;
  transitionDuration?: number; // default 0.3s
  motionEffect: ViralMotionPreset;
  colorFilter: ColorFilterType;
  volume?: number; // 0 to 1 for video's native audio
  fitMode?: 'blur-pad' | 'cover'; // 9:16 adaptation
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
  aspectRatio: AspectRatioType;
  width: number; // 1080
  height: number; // 1920
  clips: TimelineClip[];
  voiceover?: AudioStemConfig;
  backgroundMusic?: AudioStemConfig;
  subtitles: SubtitleSegment[];
  captionPosition?: CaptionPosition;
  activeSubtitleStyle?: SubtitleStyleType;
  pacing?: 'viral-fast' | 'balanced' | 'cinematic-slow';
  directorNotes?: string;
}

// Zod Schemas for LLM Structured Output Validation
export const WordTimestampSchema = z.object({
  word: z.string(),
  start: z.number().min(0),
  end: z.number().min(0),
  startMs: z.number().min(0).optional(),
  endMs: z.number().min(0).optional(),
  confidence: z.number().min(0).max(1).optional(),
  color: z.string().optional(),
});

export const CaptionPositionSchema = z.object({
  x: z.number().min(5).max(95).default(50),
  y: z.number().min(10).max(85).default(70), // Safe zone lock (10% to 85%)
});

export const SubtitleStyleTypeSchema = z.enum([
  'bouncy-karaoke',
  'hormozi',
  'minimal-clean',
  'hormozi-pop',
  'minimal-boxed',
]);

export const SubtitleSegmentSchema = z.object({
  id: z.string(),
  text: z.string(),
  startTime: z.number().min(0),
  endTime: z.number().min(0),
  words: z.array(WordTimestampSchema),
  style: SubtitleStyleTypeSchema.default('bouncy-karaoke'),
  position: CaptionPositionSchema.optional(),
  scale: z.number().min(0.5).max(3).default(1).optional(),
  rotation: z.number().default(0).optional(),
});

export const ViralMotionPresetSchema = z.enum([
  'punch_in',
  'whip_pan',
  'ken_burns_zoom',
  'white_flash',
  'none',
]);

export const TimelineClipSchema = z.object({
  id: z.string(),
  assetId: z.string(),
  startTime: z.number().min(0),
  duration: z.number().min(1.0).max(5.0).default(2.4), // Target 1.8s - 3.0s
  sourceStart: z.number().min(0).default(0),
  transition: ViralMotionPresetSchema.default('punch_in'),
  transitionDuration: z.number().min(0.1).max(1).default(0.3),
  motionEffect: ViralMotionPresetSchema.default('ken_burns_zoom'),
  colorFilter: z
    .enum(['none', 'warm-vintage', 'high-contrast', 'noir', 'cyber', 'teal-orange', 'cinematic'])
    .default('none'),
  volume: z.number().min(0).max(1).default(0),
  fitMode: z.enum(['blur-pad', 'cover']).default('blur-pad'),
});

export const AudioStemConfigSchema = z.object({
  assetId: z.string(),
  volume: z.number().min(0).max(1).default(1),
  ducking: z.boolean().default(false),
  duckingAttenuationDb: z.number().default(-16),
  fadeInDuration: z.number().min(0).default(0.2),
  fadeOutDuration: z.number().min(0).default(0.5),
});

export const TimelineSchema = z.object({
  title: z.string().default('AutoCut 9:16 Viral Edit'),
  totalDuration: z.number().min(5).max(180).default(60),
  fps: z.number().default(30),
  aspectRatio: z.enum(['9:16', '16:9', '1:1']).default('9:16'),
  width: z.number().default(1080),
  height: z.number().default(1920),
  clips: z.array(TimelineClipSchema),
  voiceover: AudioStemConfigSchema.optional(),
  backgroundMusic: AudioStemConfigSchema.optional(),
  subtitles: z.array(SubtitleSegmentSchema).default([]),
  captionPosition: CaptionPositionSchema.optional(),
  activeSubtitleStyle: SubtitleStyleTypeSchema.optional(),
  pacing: z.enum(['viral-fast', 'balanced', 'cinematic-slow']).default('viral-fast'),
  directorNotes: z.string().optional(),
});

export type TimelineSchemaType = z.infer<typeof TimelineSchema>;
