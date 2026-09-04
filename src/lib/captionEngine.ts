import { Caption, createTikTokStyleCaptions, TikTokPage } from '@remotion/captions';
import { SubtitleSegment, WordTimestamp, SubtitleStyleType } from '@/types/timeline';

export interface StrictWhisperWord {
  word: string;
  startMs: number;
  endMs: number;
  confidence: number;
  color?: string;
}

export type CaptionPagingMode = '1-to-3-bursts' | 'spoken-sentences';

/**
 * Parses raw word-level timestamps (seconds or ms) into strict milliseconds format
 */
export function normalizeToStrictWords(
  rawWords: Array<{
    word: string;
    start?: number;
    end?: number;
    startMs?: number;
    endMs?: number;
    confidence?: number;
    color?: string;
  }>
): StrictWhisperWord[] {
  return rawWords.map((w) => {
    const startMs = Math.round(w.startMs ?? (w.start !== undefined ? w.start * 1000 : 0));
    const endMs = Math.round(w.endMs ?? (w.end !== undefined ? w.end * 1000 : startMs + 350));
    return {
      word: w.word.trim(),
      startMs,
      endMs,
      confidence: w.confidence ?? 0.95,
      color: w.color,
    };
  });
}

/**
 * Utilizes @remotion/captions createTikTokStyleCaptions to segment words
 * into 1-to-3-word punchy bursts or full spoken sentences based on natural pauses (>250ms).
 */
export function paginateWordsWithRemotion(
  words: StrictWhisperWord[],
  mode: CaptionPagingMode = '1-to-3-bursts',
  style: SubtitleStyleType = 'bouncy-karaoke'
): SubtitleSegment[] {
  if (!words || words.length === 0) return [];

  // Convert to @remotion/captions Caption format
  const captions: Caption[] = words.map((w) => ({
    text: w.word,
    startMs: w.startMs,
    endMs: w.endMs,
    timestampMs: w.startMs,
    confidence: w.confidence,
  }));

  // Paging parameters:
  // 1-to-3 bursts: tight combination window (~900ms) with natural pause split (>250ms)
  // spoken sentences: wider combination window (~3200ms)
  const combineTokensWithinMilliseconds = mode === '1-to-3-bursts' ? 950 : 3200;
  const breakOnSilenceAfterMilliseconds = 250;

  const result = createTikTokStyleCaptions({
    captions,
    combineTokensWithinMilliseconds,
    breakOnSilenceAfterMilliseconds,
  });

  const segments: SubtitleSegment[] = result.pages.map((page: TikTokPage, idx: number) => {
    // Map tokens back to WordTimestamp with seconds & milliseconds
    const segmentWords: WordTimestamp[] = page.tokens.map((token) => {
      const orig = words.find(
        (w) => Math.abs(w.startMs - token.fromMs) < 50 && w.word.toLowerCase() === token.text.toLowerCase()
      );
      return {
        word: token.text,
        start: Number((token.fromMs / 1000).toFixed(3)),
        end: Number((token.toMs / 1000).toFixed(3)),
        startMs: token.fromMs,
        endMs: token.toMs,
        confidence: orig?.confidence ?? 0.95,
        color: orig?.color,
      };
    });

    const startSeconds = Number((page.startMs / 1000).toFixed(3));
    const endSeconds = Number(((page.startMs + page.durationMs) / 1000).toFixed(3));

    return {
      id: `caption_seg_${idx + 1}_${Date.now().toString(36).slice(-4)}`,
      text: page.text.trim(),
      startTime: startSeconds,
      endTime: endSeconds,
      words: segmentWords,
      style,
      position: { x: 50, y: 72 },
    };
  });

  return segments;
}

/**
 * Splits a subtitle segment at a specific word index into two separate segments
 */
export function splitSegmentAtWordIndex(
  segment: SubtitleSegment,
  wordIndex: number
): [SubtitleSegment, SubtitleSegment] | null {
  if (wordIndex <= 0 || wordIndex >= segment.words.length) return null;

  const firstWords = segment.words.slice(0, wordIndex);
  const secondWords = segment.words.slice(wordIndex);

  const seg1: SubtitleSegment = {
    ...segment,
    id: `seg_${Date.now()}_1`,
    text: firstWords.map((w) => w.word).join(' '),
    startTime: firstWords[0].start,
    endTime: firstWords[firstWords.length - 1].end,
    words: firstWords,
  };

  const seg2: SubtitleSegment = {
    ...segment,
    id: `seg_${Date.now()}_2`,
    text: secondWords.map((w) => w.word).join(' '),
    startTime: secondWords[0].start,
    endTime: secondWords[secondWords.length - 1].end,
    words: secondWords,
  };

  return [seg1, seg2];
}

/**
 * Merges two adjacent subtitle segments into a single segment
 */
export function mergeAdjacentSegments(
  first: SubtitleSegment,
  second: SubtitleSegment
): SubtitleSegment {
  const combinedWords = [...first.words, ...second.words];
  return {
    ...first,
    id: `merged_${first.id}_${second.id}`,
    text: `${first.text} ${second.text}`,
    startTime: first.startTime,
    endTime: Math.max(first.endTime, second.endTime),
    words: combinedWords,
  };
}
