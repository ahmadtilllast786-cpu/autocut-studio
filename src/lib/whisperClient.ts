import { SubtitleSegment, WordTimestamp } from '@/types/timeline';

export interface WhisperWord {
  word: string;
  start: number;
  end: number;
}

export interface WhisperResponse {
  text: string;
  words?: WhisperWord[];
}

/**
 * Transcribe an audio file using OpenAI Whisper API with word-level timestamps.
 */
export async function transcribeWithWhisper(
  audioFile: File | Blob,
  apiKey: string
): Promise<SubtitleSegment[]> {
  const formData = new FormData();
  formData.append('file', audioFile, 'voiceover.mp3');
  formData.append('model', 'whisper-1');
  formData.append('response_format', 'verbose_json');
  formData.append('timestamp_granularities[]', 'word');

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Whisper API transcription failed (${response.status}): ${errText}`);
  }

  const data: WhisperResponse = await response.json();

  if (!data.words || data.words.length === 0) {
    // If word timestamps weren't returned, generate aligned word timestamps from text
    return generateSegmentsFromText(data.text || 'AutoCut Studio Automated Voiceover', 0, 60);
  }

  return groupWordsIntoViralSegments(data.words);
}

/**
 * Group raw word timestamps into short, punchy 3-6 word caption segments
 * tailored for fast-paced 9:16 vertical short-form retention.
 */
export function groupWordsIntoViralSegments(
  words: WhisperWord[],
  wordsPerSegment = 5
): SubtitleSegment[] {
  const segments: SubtitleSegment[] = [];
  let currentWords: WordTimestamp[] = [];

  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    currentWords.push({
      word: w.word.trim(),
      start: Number(w.start.toFixed(2)),
      end: Number(w.end.toFixed(2)),
    });

    const isEndOfSentence = /[.!?]$/.test(w.word.trim());
    const isSegmentFull = currentWords.length >= wordsPerSegment;
    const isLastWord = i === words.length - 1;

    // Check time gap to next word
    const nextGap = i < words.length - 1 ? words[i + 1].start - w.end : 0;
    const isPause = nextGap > 0.6;

    if (isSegmentFull || isEndOfSentence || isPause || isLastWord) {
      if (currentWords.length > 0) {
        const text = currentWords.map((item) => item.word).join(' ');
        segments.push({
          id: `sub_${segments.length + 1}`,
          text,
          startTime: currentWords[0].start,
          endTime: currentWords[currentWords.length - 1].end,
          words: [...currentWords],
          style: 'viral-highlight',
        });
        currentWords = [];
      }
    }
  }

  return segments;
}

/**
 * Fallback generator for custom text or mock transcripts with realistic pacing.
 */
export function generateSegmentsFromText(
  text: string,
  startTime = 0.5,
  maxDuration = 60
): SubtitleSegment[] {
  const cleanWords = text.split(/\s+/).filter(Boolean);
  if (cleanWords.length === 0) return [];

  const timePerWord = 0.35; // ~170 words per minute average speaking rate
  const rawWords: WhisperWord[] = [];
  let t = startTime;

  for (const word of cleanWords) {
    if (t >= maxDuration - 1) break;
    const start = t;
    const end = Math.min(maxDuration - 0.2, t + timePerWord);
    rawWords.push({ word, start, end });
    t = end + 0.05;
  }

  return groupWordsIntoViralSegments(rawWords);
}
