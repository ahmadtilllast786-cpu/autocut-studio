import { SubtitleSegment, WordTimestamp, Timeline } from '@/types/timeline';
import { StrictWhisperWord } from './captionEngine';

export interface SilenceInterval {
  startMs: number;
  endMs: number;
  durationMs: number;
}

export interface SilenceStripResult<T> {
  result: T;
  totalTimeSavedSec: number;
  trimmedPausesCount: number;
  detectedSilences: SilenceInterval[];
}

/**
 * Detects dead pauses greater than minSilenceMs (default 250ms) between words.
 */
export function detectSilenceIntervals(
  words: (WordTimestamp | StrictWhisperWord)[],
  minSilenceMs = 250
): SilenceInterval[] {
  if (!words || words.length < 2) return [];

  const silences: SilenceInterval[] = [];

  for (let i = 0; i < words.length - 1; i++) {
    const curr = words[i];
    const next = words[i + 1];
    const currentEnd =
      'endMs' in curr && curr.endMs !== undefined
        ? curr.endMs
        : 'end' in curr
        ? Math.round(curr.end * 1000)
        : 0;

    const nextStart =
      'startMs' in next && next.startMs !== undefined
        ? next.startMs
        : 'start' in next
        ? Math.round(next.start * 1000)
        : 0;

    const gapMs = nextStart - currentEnd;
    if (gapMs > minSilenceMs) {
      silences.push({
        startMs: currentEnd,
        endMs: nextStart,
        durationMs: gapMs,
      });
    }
  }

  return silences;
}

/**
 * Strips all dead pauses (> maxSilenceMs, default 250ms) from word-level timestamps.
 * Trims excess silence down to targetGapMs (default 120ms) to ensure punchy, viral pacing.
 */
export function stripSilenceFromWords(
  words: WordTimestamp[],
  maxSilenceMs = 250,
  targetGapMs = 120
): SilenceStripResult<WordTimestamp[]> {
  if (!words || words.length === 0) {
    return {
      result: [],
      totalTimeSavedSec: 0,
      trimmedPausesCount: 0,
      detectedSilences: [],
    };
  }

  const detectedSilences = detectSilenceIntervals(words, maxSilenceMs);
  let accumulatedShiftMs = 0;
  let trimmedCount = 0;

  const strippedWords: WordTimestamp[] = [];

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const startMs = word.startMs ?? Math.round(word.start * 1000);
    const endMs = word.endMs ?? Math.round(word.end * 1000);

    if (i > 0) {
      const prevOrigEndMs = words[i - 1].endMs ?? Math.round(words[i - 1].end * 1000);
      const originalGapMs = startMs - prevOrigEndMs;

      if (originalGapMs > maxSilenceMs) {
        const excessMs = originalGapMs - targetGapMs;
        accumulatedShiftMs += excessMs;
        trimmedCount++;
      }
    }

    const newStartMs = Math.max(0, startMs - accumulatedShiftMs);
    const wordDuration = Math.max(80, endMs - startMs);
    const newEndMs = newStartMs + wordDuration;

    strippedWords.push({
      ...word,
      start: Number((newStartMs / 1000).toFixed(3)),
      end: Number((newEndMs / 1000).toFixed(3)),
      startMs: newStartMs,
      endMs: newEndMs,
    });
  }

  const totalTimeSavedSec = Number((accumulatedShiftMs / 1000).toFixed(3));

  return {
    result: strippedWords,
    totalTimeSavedSec,
    trimmedPausesCount: trimmedCount,
    detectedSilences,
  };
}

/**
 * Strips dead pauses (> maxSilenceMs) across SubtitleSegments and recalculates
 * segment boundaries and word alignments.
 */
export function stripSilenceFromSubtitles(
  subtitles: SubtitleSegment[],
  maxSilenceMs = 250,
  targetGapMs = 120
): SilenceStripResult<SubtitleSegment[]> {
  if (!subtitles || subtitles.length === 0) {
    return {
      result: [],
      totalTimeSavedSec: 0,
      trimmedPausesCount: 0,
      detectedSilences: [],
    };
  }

  // Flatten all words
  const allWordsWithSegIndex: { segIdx: number; word: WordTimestamp }[] = [];
  subtitles.forEach((seg, sIdx) => {
    seg.words.forEach((w) => {
      allWordsWithSegIndex.push({ segIdx: sIdx, word: { ...w } });
    });
  });

  if (allWordsWithSegIndex.length === 0) {
    return {
      result: subtitles,
      totalTimeSavedSec: 0,
      trimmedPausesCount: 0,
      detectedSilences: [],
    };
  }

  const wordsOnly = allWordsWithSegIndex.map((x) => x.word);
  const strippedWordResult = stripSilenceFromWords(wordsOnly, maxSilenceMs, targetGapMs);

  // Group stripped words back to their segments
  const newSubtitles: SubtitleSegment[] = subtitles.map((seg, sIdx) => {
    const segWords = strippedWordResult.result.filter(
      (_, i) => allWordsWithSegIndex[i].segIdx === sIdx
    );

    if (segWords.length === 0) {
      return seg;
    }

    const startTime = segWords[0].start;
    const endTime = segWords[segWords.length - 1].end;

    return {
      ...seg,
      startTime,
      endTime,
      words: segWords,
    };
  });

  return {
    result: newSubtitles,
    totalTimeSavedSec: strippedWordResult.totalTimeSavedSec,
    trimmedPausesCount: strippedWordResult.trimmedPausesCount,
    detectedSilences: strippedWordResult.detectedSilences,
  };
}

/**
 * Applies Voice Activity Detection (VAD) silence trimming to an entire timeline,
 * compressing subtitles and updating duration.
 */
export function applyVADSilenceStripping(
  timeline: Timeline,
  maxSilenceMs = 250
): { updatedTimeline: Timeline; timeSavedSec: number; pausesTrimmed: number } {
  const result = stripSilenceFromSubtitles(timeline.subtitles, maxSilenceMs);

  const updatedTimeline: Timeline = {
    ...timeline,
    subtitles: result.result,
    totalDuration: Math.max(5, Number((timeline.totalDuration - result.totalTimeSavedSec).toFixed(2))),
  };

  return {
    updatedTimeline,
    timeSavedSec: result.totalTimeSavedSec,
    pausesTrimmed: result.trimmedPausesCount,
  };
}
