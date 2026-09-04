import { SubtitleSegment } from '@/types/timeline';

export interface SpeechInterval {
  start: number;
  end: number;
}

/**
 * Convert decibels to linear audio gain multiplier.
 * e.g. -16 dB => 10^(-16 / 20) ≈ 0.158489
 */
export function dbToGain(db: number): number {
  return Math.pow(10, db / 20);
}

/**
 * Extracts active speech intervals from subtitle segments with lead-in and decay padding.
 */
export function extractSpeechIntervals(
  subtitles: SubtitleSegment[],
  leadInSeconds = 0.15,
  decaySeconds = 0.25
): SpeechInterval[] {
  if (!subtitles || subtitles.length === 0) return [];

  const rawIntervals: SpeechInterval[] = subtitles.map((sub) => ({
    start: Math.max(0, sub.startTime - leadInSeconds),
    end: sub.endTime + decaySeconds,
  }));

  // Sort and merge overlapping or closely spaced intervals
  rawIntervals.sort((a, b) => a.start - b.start);

  const merged: SpeechInterval[] = [];
  for (const curr of rawIntervals) {
    if (merged.length === 0) {
      merged.push({ ...curr });
    } else {
      const prev = merged[merged.length - 1];
      if (curr.start <= prev.end + 0.2) {
        // Merge close intervals to avoid fluttering
        prev.end = Math.max(prev.end, curr.end);
      } else {
        merged.push({ ...curr });
      }
    }
  }

  return merged;
}

/**
 * Calculates current background music gain at a specific timestamp,
 * smoothly ducking volume by duckingAttenuationDb (default -16 dB) during speech.
 */
export function getDuckGainAtTime(
  currentTime: number,
  speechIntervals: SpeechInterval[],
  baseVolume = 0.35,
  duckingDb = -16,
  fadeDuration = 0.2
): { currentGain: number; isDucking: boolean } {
  const duckMultiplier = dbToGain(duckingDb); // ~0.158 for -16dB
  const duckedVolume = baseVolume * duckMultiplier;

  for (const interval of speechIntervals) {
    // Before interval
    if (currentTime < interval.start - fadeDuration) {
      continue;
    }
    // Ramping down into speech (Attack)
    if (currentTime >= interval.start - fadeDuration && currentTime < interval.start) {
      const t = (currentTime - (interval.start - fadeDuration)) / fadeDuration;
      const smoothT = t * t * (3 - 2 * t); // smoothstep
      const gain = baseVolume - smoothT * (baseVolume - duckedVolume);
      return { currentGain: gain, isDucking: true };
    }
    // Fully in speech interval
    if (currentTime >= interval.start && currentTime <= interval.end) {
      return { currentGain: duckedVolume, isDucking: true };
    }
    // Ramping back up after speech (Release)
    if (currentTime > interval.end && currentTime <= interval.end + fadeDuration) {
      const t = (currentTime - interval.end) / fadeDuration;
      const smoothT = t * t * (3 - 2 * t); // smoothstep
      const gain = duckedVolume + smoothT * (baseVolume - duckedVolume);
      return { currentGain: gain, isDucking: true };
    }
  }

  return { currentGain: baseVolume, isDucking: false };
}

/**
 * Generates an points array representing the ducking envelope over 60 seconds
 * for UI visualization in the timeline waveform track.
 */
export function generateDuckingEnvelope(
  subtitles: SubtitleSegment[],
  totalDuration = 60,
  step = 0.25,
  duckingDb = -16
): { time: number; gainDb: number; isDucking: boolean }[] {
  const intervals = extractSpeechIntervals(subtitles);
  const envelope: { time: number; gainDb: number; isDucking: boolean }[] = [];

  for (let t = 0; t <= totalDuration; t += step) {
    const { isDucking, currentGain } = getDuckGainAtTime(t, intervals, 1.0, duckingDb, 0.2);
    const gainDb = isDucking ? 20 * Math.log10(Math.max(0.01, currentGain)) : 0;
    envelope.push({
      time: Number(t.toFixed(2)),
      gainDb: Number(gainDb.toFixed(1)),
      isDucking,
    });
  }

  return envelope;
}

/**
 * Creates synthesized demo speech & music audio buffers using Web Audio API
 * to guarantee that audio plays in all environments without CORS or network hurdles.
 */
export class SyntheticAudioProvider {
  private static ctx: AudioContext | null = null;

  static getAudioContext(): AudioContext {
    if (!this.ctx || this.ctx.state === 'closed') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  /**
   * Generates a 60-second melodic synthwave background beat buffer.
   */
  static generateSynthwaveMusicBuffer(ctx: AudioContext, duration = 60): AudioBuffer {
    const sampleRate = ctx.sampleRate;
    const buffer = ctx.createBuffer(2, sampleRate * duration, sampleRate);
    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);

    const tempo = 124; // BPM
    const secondsPerBeat = 60 / tempo;
    const chords = [
      [220.0, 261.63, 329.63], // Am
      [174.61, 220.0, 261.63], // F
      [130.81, 164.81, 196.0], // C
      [196.0, 246.94, 293.66], // G
    ];

    for (let i = 0; i < left.length; i++) {
      const t = i / sampleRate;
      const beat = (t / secondsPerBeat) % 16;
      const chordIndex = Math.floor(beat / 4) % chords.length;
      const currentChord = chords[chordIndex];

      // Bassline pulse
      const bassFreq = currentChord[0] / 2;
      const bassEnv = Math.exp(-((t % (secondsPerBeat / 2)) * 6));
      const bass = Math.sin(2 * Math.PI * bassFreq * t) * bassEnv * 0.3;

      // Chord pad shimmer
      let pad = 0;
      for (const freq of currentChord) {
        pad += Math.sin(2 * Math.PI * freq * t) * 0.08;
      }

      // Hi-hat groove every half beat
      const hatPhase = (t % (secondsPerBeat / 2)) / (secondsPerBeat / 2);
      const hat = hatPhase < 0.1 ? (Math.random() * 2 - 1) * Math.exp(-hatPhase * 30) * 0.12 : 0;

      const sample = (bass + pad + hat) * 0.4;
      left[i] = sample;
      right[i] = sample;
    }

    return buffer;
  }
}
