import { MediaAsset, Timeline, TimelineSchema, TimelineClip, TransitionType, MotionEffectType, ColorFilterType } from '@/types/timeline';
import { SAMPLE_SUBTITLES } from './sampleAssets';

export const SYSTEM_PROMPT = `You are a master professional short-form vertical video editor (TikTok, Instagram Reels, YouTube Shorts).
Your job is to receive a natural-language script/prompt from the creator, along with a catalog of available registered media asset codes (e.g. VID_01, VID_02, IMG_01, VO_TRACK, BG_MUSIC), and compile a strictly structured Timeline JSON totaling exactly 60.0 seconds of vertical 9:16 footage with ZERO manual editing needed.

CRITICAL SHORT-FORM VIRAL GUIDELINES:
1. Pacing & Cut Frequency:
   - Every on-screen visual MUST change every 1.8 to 3.0 seconds (target average ~2.4 seconds) for maximum viewer retention.
   - Never let any visual clip remain on screen for longer than 3.0 seconds.
   - Sequence clips sequentially from time 0 to 60 seconds (clip[i].startTime + clip[i].duration == clip[i+1].startTime).
2. 4 Viral Motion Presets:
   - Restrict transitions and motion effects strictly to:
     - 'punch_in': Rapid zoom jump (1.0 -> 1.18) for high-energy emphasis
     - 'whip_pan': High-velocity lateral pan blur transition
     - 'ken_burns_zoom': Smooth continuous dynamic zoom
     - 'white_flash': Fast high-intensity luminance burst
   - Static images and videos must both use these programmatic motion presets.
3. 9:16 Vertical Canvas:
   - Always set aspectRatio to '9:16', width: 1080, height: 1920.
   - Assign fitMode: 'blur-pad' to gracefully pad non-vertical media with blurred backdrops.
4. Color Grading:
   - Match the tone to the prompt: 'warm-vintage', 'high-contrast', 'noir', 'cyber', 'teal-orange', 'cinematic'.
5. Audio Stems & Ducking:
   - VO_TRACK: volume 1.0, ducking: true.
   - BG_MUSIC: volume 0.35, duckingAttenuationDb: -16 (automatically ducked by -16 dB during speech).
6. Captions:
   - Default style: 'bouncy-karaoke'. Position safe-zone locked (y between 20% and 80%).
7. Output Format:
   - You MUST output ONLY raw valid JSON matching the specified Timeline schema. Do not enclose in markdown code blocks.`;

export interface DirectorRequest {
  userPrompt: string;
  assets: MediaAsset[];
  pacing?: 'viral-fast' | 'balanced' | 'cinematic-slow';
  provider?: 'smart-director' | 'gemini' | 'openai';
  apiKey?: string;
  model?: string;
}

export async function generateTimeline(request: DirectorRequest): Promise<Timeline> {
  const { userPrompt, assets, pacing = 'viral-fast', provider = 'smart-director', apiKey, model } = request;

  if (assets.length === 0) {
    throw new Error('Please upload or select at least one media asset to create an edit.');
  }

  // 1. If Gemini is selected and API key is provided
  if (provider === 'gemini' && apiKey?.trim()) {
    try {
      const geminiResult = await callGeminiDirector(apiKey.trim(), userPrompt, assets, pacing, model || 'gemini-2.5-flash');
      return TimelineSchema.parse(geminiResult);
    } catch (err: unknown) {
      console.warn('Gemini API call failed, falling back to Smart AI Director:', err);
    }
  }

  // 2. If OpenAI is selected and API key is provided
  if (provider === 'openai' && apiKey?.trim()) {
    try {
      const openAiResult = await callOpenAIDirector(apiKey.trim(), userPrompt, assets, pacing, model || 'gpt-4o-mini');
      return TimelineSchema.parse(openAiResult);
    } catch (err: unknown) {
      console.warn('OpenAI API call failed, falling back to Smart AI Director:', err);
    }
  }

  // 3. Built-in Smart AI Director (Deterministic, natural language parsing, guaranteed valid 60s cut)
  return runSmartDirector(userPrompt, assets, pacing);
}

// Built-in intelligent rule-based AI Director for Viral Short-Form Retention
export function runSmartDirector(
  userPrompt: string,
  assets: MediaAsset[],
  pacing: 'viral-fast' | 'balanced' | 'cinematic-slow' = 'viral-fast'
): Timeline {
  const promptLower = userPrompt.toLowerCase();
  
  // Separate asset types
  const videoAssets = assets.filter((a) => a.type === 'video');
  const imageAssets = assets.filter((a) => a.type === 'image');
  const voAsset = assets.find((a) => a.id === 'VO_TRACK' || a.type === 'voiceover');
  const bgmAsset = assets.find((a) => a.id === 'BG_MUSIC' || a.type === 'music');
  const visualPool = [...videoAssets, ...imageAssets];

  if (visualPool.length === 0) {
    throw new Error('No visual assets (videos or images) found in the media bin.');
  }

  // Detect style/filter from user prompt
  let chosenFilter: ColorFilterType = 'none';
  if (promptLower.includes('cyber') || promptLower.includes('neon') || promptLower.includes('tech')) {
    chosenFilter = 'cyber';
  } else if (promptLower.includes('vintage') || promptLower.includes('retro') || promptLower.includes('warm')) {
    chosenFilter = 'warm-vintage';
  } else if (promptLower.includes('noir') || promptLower.includes('dark') || promptLower.includes('mystery')) {
    chosenFilter = 'noir';
  } else if (promptLower.includes('cinematic') || promptLower.includes('teal')) {
    chosenFilter = 'teal-orange';
  } else if (promptLower.includes('contrast') || promptLower.includes('vibrant') || promptLower.includes('viral')) {
    chosenFilter = 'high-contrast';
  }

  // Rhythmic viral cut durations alternating between 1.8s and 3.0s (average ~2.4s)
  const viralCutDurations = [2.0, 1.8, 2.5, 2.2, 3.0, 2.4, 1.9, 2.8, 2.1, 2.7];
  if (pacing === 'cinematic-slow') {
    // Keep max 3.0s for viral rule but favor upper boundary (2.6s - 3.0s)
    viralCutDurations.splice(0, viralCutDurations.length, 2.8, 3.0, 2.6, 2.9, 2.7);
  } else if (pacing === 'viral-fast') {
    // Favor 1.8s - 2.2s cuts
    viralCutDurations.splice(0, viralCutDurations.length, 1.8, 2.0, 1.9, 2.2, 1.8, 2.4);
  }

  // Check if specific asset codes are referenced in the prompt (e.g. VID_01, VID_02)
  const referencedCodes: string[] = [];
  for (const a of visualPool) {
    if (userPrompt.toUpperCase().includes(a.id.toUpperCase())) {
      referencedCodes.push(a.id);
    }
  }

  const prioritizedVisuals = referencedCodes.length > 0
    ? [
        ...referencedCodes.map((code) => visualPool.find((v) => v.id === code)!).filter(Boolean),
        ...visualPool.filter((v) => !referencedCodes.includes(v.id)),
      ]
    : [...visualPool];

  const totalTarget = 60.0;
  const clips: TimelineClip[] = [];
  let currentTime = 0;
  let clipIndex = 0;

  // The 4 Programmatic Motion Presets
  const viralMotions: TransitionType[] = ['punch_in', 'whip_pan', 'ken_burns_zoom', 'white_flash'];

  while (currentTime < totalTarget) {
    const asset = prioritizedVisuals[clipIndex % prioritizedVisuals.length];
    const baseDuration = viralCutDurations[clipIndex % viralCutDurations.length];
    
    let clipDuration = baseDuration;
    const remainingTime = totalTarget - currentTime;

    if (remainingTime <= 3.2) {
      clipDuration = Number(remainingTime.toFixed(2));
    } else if (remainingTime - clipDuration < 1.8) {
      // Avoid leaving a dangling cut under 1.8s
      clipDuration = Number((remainingTime / 2).toFixed(2));
    }

    const isVideo = asset.type === 'video';
    const maxSourceStart = isVideo && asset.duration > clipDuration ? Math.max(0, asset.duration - clipDuration) : 0;
    const sourceStart = Number(((clipIndex * 2.0) % Math.max(1, maxSourceStart)).toFixed(2));

    const transition = clipIndex === 0 ? 'none' : viralMotions[(clipIndex - 1) % viralMotions.length];
    const motionEffect = viralMotions[clipIndex % viralMotions.length];

    // Slightly alternate filters for aesthetic rhythm
    const clipFilter = clipIndex % 4 === 0 && chosenFilter !== 'none' ? chosenFilter : (chosenFilter === 'cyber' ? 'teal-orange' : chosenFilter);

    clips.push({
      id: `clip_${clipIndex + 1}`,
      assetId: asset.id,
      startTime: Number(currentTime.toFixed(2)),
      duration: clipDuration,
      sourceStart,
      transition,
      transitionDuration: 0.3,
      motionEffect,
      colorFilter: clipFilter,
      volume: 0,
      fitMode: 'blur-pad',
    });

    currentTime += clipDuration;
    clipIndex++;
  }

  return {
    title: `AutoCut 9:16 Viral Edit: ${userPrompt.slice(0, 25)}...`,
    totalDuration: 60,
    fps: 30,
    aspectRatio: '9:16',
    width: 1080,
    height: 1920,
    clips,
    voiceover: voAsset
      ? {
          assetId: voAsset.id,
          volume: 1.0,
          ducking: true,
          duckingAttenuationDb: -16,
          fadeInDuration: 0.2,
          fadeOutDuration: 0.5,
        }
      : undefined,
    backgroundMusic: bgmAsset
      ? {
          assetId: bgmAsset.id,
          volume: 0.35,
          ducking: false,
          duckingAttenuationDb: -16,
          fadeInDuration: 0.5,
          fadeOutDuration: 1.0,
        }
      : undefined,
    subtitles: SAMPLE_SUBTITLES,
    captionPosition: { x: 50, y: 70 },
    activeSubtitleStyle: 'bouncy-karaoke',
    pacing,
    directorNotes: `Constructed viral 9:16 short-form timeline with ${clips.length} cuts (changing visuals every 1.8-3.0s). Assigned 4 viral motion presets (punch_in, whip_pan, ken_burns_zoom, white_flash), automatic -16dB ducking envelope on ${bgmAsset?.id || 'BG_MUSIC'}, and 9:16 blur-padding.`,
  };
}

// Google Gemini API integration
async function callGeminiDirector(
  apiKey: string,
  userPrompt: string,
  assets: MediaAsset[],
  pacing: string,
  modelName: string
): Promise<unknown> {
  const assetSummary = assets.map((a) => `- ID: ${a.id} | Type: ${a.type} | Duration: ${a.duration}s | Name: ${a.name}`).join('\n');

  const fullPrompt = `${SYSTEM_PROMPT}

AVAILABLE ASSETS:
${assetSummary}

USER EDITING INSTRUCTION:
${userPrompt}

PACING PREFERENCE:
${pacing}

Output valid JSON matching the 60-second vertical video Timeline schema. Return ONLY valid JSON:`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.3,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const textOutput = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!textOutput) {
    throw new Error('Gemini API returned an empty response.');
  }

  return JSON.parse(textOutput);
}

// OpenAI API integration
async function callOpenAIDirector(
  apiKey: string,
  userPrompt: string,
  assets: MediaAsset[],
  pacing: string,
  modelName: string
): Promise<unknown> {
  const assetSummary = assets.map((a) => `- ID: ${a.id} | Type: ${a.type} | Duration: ${a.duration}s | Name: ${a.name}`).join('\n');

  const fullPrompt = `AVAILABLE ASSETS:\n${assetSummary}\n\nUSER PROMPT:\n${userPrompt}\n\nPACING:\n${pacing}`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: modelName,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: fullPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('OpenAI returned an empty completion.');
  }

  return JSON.parse(content);
}
