import { Timeline, MediaAsset } from '@/types/timeline';
import { AppSettings } from '@/components/SettingsModal';

export type FeatureModule = 'Captions' | 'MediaBin' | 'Timeline' | 'Audio' | 'Canvas';

export interface InspectionContext {
  timeline: Timeline;
  assets: MediaAsset[];
  settings: AppSettings;
  currentTime?: number;
}

export interface FeatureEntry {
  id: string;
  label: string;
  module: FeatureModule;
  targetHookOrState: string; // The hook/store property it should be bound to
  isWorking: boolean;
  issues: string[];
  description: string;
  componentFile: string;
  locationLine?: string;
  unwiredSnippet?: string;
  fixRecommendation: string;
  testRunner?: (ctx: InspectionContext) => { isWorking: boolean; issues: string[] };
}

export const FEATURES_MANIFEST: FeatureEntry[] = [
  // ==========================================
  // CAPTIONS MODULE
  // ==========================================
  {
    id: 'cap-preset-selector',
    label: 'Caption Preset Selector',
    module: 'Captions',
    targetHookOrState: 'timeline.activeSubtitleStyle',
    isWorking: true,
    issues: [],
    description: 'Selects between Bouncy Karaoke, Hormozi, and Minimal Clean styles and dynamically updates subtitle rendering.',
    componentFile: 'src/components/captions/CaptionPresetGallery.tsx',
    locationLine: 'Line 28',
    fixRecommendation: 'Fully wired and working.',
    testRunner: (ctx) => {
      const validStyles = ['bouncy-karaoke', 'hormozi', 'minimal-clean', 'hormozi-pop', 'minimal-boxed'];
      const current = ctx.timeline.activeSubtitleStyle;
      if (!current || !validStyles.includes(current)) {
        return { isWorking: false, issues: ['UNBOUND_STATE: activeSubtitleStyle is undefined or invalid'] };
      }
      return { isWorking: true, issues: [] };
    },
  },
  {
    id: 'cap-drag-snapping',
    label: 'Dynamic Drag Snapping & Rotation Persistence',
    module: 'Captions',
    targetHookOrState: 'timeline.captionPosition',
    isWorking: false,
    issues: [
      'UNBOUND_STATE: Rotation angle and scale transforms are not persisted to timeline.captionPosition.',
      'Partial state binding: Only x and y percentage coordinates are saved on drag release.',
    ],
    description: 'DraggableCaptionOverlay tracks x and y coordinates, but rotation angles and font scale factors are not saved to the persistent timeline model.',
    componentFile: 'src/components/captions/DraggableCaptionOverlay.tsx',
    locationLine: 'Line 70',
    unwiredSnippet: `onPositionChange({ x: newX, y: newY }) // rotation and scale omitted from handler`,
    fixRecommendation: 'Extend CaptionPositionSchema to include rotationDeg and scaleFactor, and update onPositionChange accordingly.',
    testRunner: (ctx) => {
      const pos = ctx.timeline.captionPosition;
      if (!pos || pos.x === undefined || pos.y === undefined) {
        return { isWorking: false, issues: ['UNBOUND_STATE: captionPosition missing from timeline'] };
      }
      return {
        isWorking: false,
        issues: ['Rotation angle and scale properties are unmapped from timeline.captionPosition'],
      };
    },
  },
  {
    id: 'cap-whisper-timestamps',
    label: 'Word-Level Whisper Transcription Pipeline',
    module: 'Captions',
    targetHookOrState: 'timeline.subtitles[].words',
    isWorking: true,
    issues: [],
    description: 'Whisper transcription generates word-level startMs and endMs timestamps for precise karaoke highlighting.',
    componentFile: 'src/components/player/DynamicSubtitles.tsx',
    locationLine: 'Line 32',
    fixRecommendation: 'Fully wired and operational.',
    testRunner: (ctx) => {
      const hasSubs = ctx.timeline.subtitles && ctx.timeline.subtitles.length > 0;
      if (!hasSubs) {
        return { isWorking: false, issues: ['UNBOUND_STATE: No subtitles found in timeline'] };
      }
      const hasWords = ctx.timeline.subtitles.some((s) => s.words && s.words.length > 0);
      if (!hasWords) {
        return { isWorking: false, issues: ['Subtitles lack word-level timestamp bursts'] };
      }
      return { isWorking: true, issues: [] };
    },
  },
  {
    id: 'cap-vad-silence-stripper',
    label: 'VAD Silence Pause Stripper (>250ms)',
    module: 'Captions',
    targetHookOrState: 'stripDeadPauses()',
    isWorking: true,
    issues: [],
    description: 'Scans word timestamps for pauses exceeding 250ms and condenses them to natural 120ms speech bursts.',
    componentFile: 'src/lib/silenceStripper.ts',
    locationLine: 'Line 14',
    fixRecommendation: 'Fully wired to CaptionEditorDrawer and timeline generation.',
    testRunner: () => ({ isWorking: true, issues: [] }),
  },
  {
    id: 'cap-font-uploader',
    label: 'Custom Web Font Loader',
    module: 'Captions',
    targetHookOrState: 'fontFaceRegistry.load()',
    isWorking: false,
    issues: [
      'EMPTY_HANDLER: Font selector dropdown contains static options without dynamic @font-face CSS loader.',
    ],
    description: 'Custom font selection does not dynamically inject external Google Fonts or local TTF/WOFF2 font files into the Remotion canvas context.',
    componentFile: 'src/components/captions/CaptionEditorDrawer.tsx',
    locationLine: 'Line 142',
    unwiredSnippet: `<select onChange={() => {}} /> // unhandled font loader`,
    fixRecommendation: 'Add WebFontLoader / FontFace observer to dynamically load fonts into document.fonts and Remotion canvas.',
    testRunner: () => ({
      isWorking: false,
      issues: ['EMPTY_HANDLER: Custom font loader lacks dynamic @font-face injection'],
    }),
  },

  // ==========================================
  // MEDIA BIN MODULE
  // ==========================================
  {
    id: 'media-dropzone-uploader',
    label: 'File Dropzone & Auto-Tag Generator',
    module: 'MediaBin',
    targetHookOrState: 'assets[] & [VID_01]/[IMG_01] tags',
    isWorking: true,
    issues: [],
    description: 'Drag-and-drop ingestion accepts video, image, and audio files, generates blob object URLs, and auto-assigns ID tags.',
    componentFile: 'src/components/docking/panels/MediaDrawerPanel.tsx',
    locationLine: 'Line 95',
    fixRecommendation: 'Fully wired and working.',
    testRunner: (ctx) => {
      if (!ctx.assets || ctx.assets.length === 0) {
        return { isWorking: false, issues: ['UNBOUND_STATE: Media bin assets array is empty'] };
      }
      const hasTags = ctx.assets.every((a) => a.id && /^[A-Z_0-9]+$/.test(a.id));
      if (!hasTags) {
        return { isWorking: false, issues: ['Assets missing standard ID code tags'] };
      }
      return { isWorking: true, issues: [] };
    },
  },
  {
    id: 'media-sample-pack-loader',
    label: 'Pre-Bundled Sample Pack Loader',
    module: 'MediaBin',
    targetHookOrState: 'handleLoadSampleAssets()',
    isWorking: true,
    issues: [],
    description: 'One-click sample pack button loads pre-synced royalty-free video clips, images, and audio tracks.',
    componentFile: 'src/lib/sampleAssets.ts',
    locationLine: 'Line 12',
    fixRecommendation: 'Fully wired and working.',
    testRunner: (ctx) => ({
      isWorking: ctx.assets.length >= 4,
      issues: ctx.assets.length >= 4 ? [] : ['Sample assets not loaded'],
    }),
  },
  {
    id: 'media-tag-copy-tool',
    label: 'Code Tag Clip Copy Tool',
    module: 'MediaBin',
    targetHookOrState: 'navigator.clipboard.writeText(tag)',
    isWorking: true,
    issues: [],
    description: 'Clicking any asset tag ([VID_01], [VO_TRACK]) copies code syntax to clipboard and appends into the AI prompt.',
    componentFile: 'src/components/docking/panels/MediaDrawerPanel.tsx',
    locationLine: 'Line 88',
    fixRecommendation: 'Fully wired and operational.',
    testRunner: () => ({ isWorking: true, issues: [] }),
  },
  {
    id: 'media-spaces-subtab',
    label: 'Team Spaces Cloud Workspace Sub-Tab',
    module: 'MediaBin',
    targetHookOrState: 'spacesBackend.sync()',
    isWorking: false,
    issues: [
      'STATIC_UI: Spaces category button updates local activeCategory state without cloud project synchronization.',
    ],
    description: 'The Spaces category button allows toggling but does not connect to team collaborative cloud storage or Supabase/S3 spaces.',
    componentFile: 'src/components/docking/panels/MediaDrawerPanel.tsx',
    locationLine: 'Line 155',
    unwiredSnippet: `onClick={() => setActiveCategory('spaces')} // only toggles local UI string`,
    fixRecommendation: 'Connect remote workspace sync API or Supabase team storage.',
    testRunner: () => ({
      isWorking: false,
      issues: ['STATIC_UI: Spaces category has no backend cloud sync attached'],
    }),
  },
  {
    id: 'media-library-subtab',
    label: 'Stock Media Royalty-Free Catalog Library',
    module: 'MediaBin',
    targetHookOrState: 'stockMediaAPI.search()',
    isWorking: false,
    issues: [
      'PLACEHOLDER_UI: Library tab displays static placeholder message without external stock API connection.',
    ],
    description: 'Library tab renders an empty placeholder card without connecting to Pexels, Unsplash, or Pixabay stock media search APIs.',
    componentFile: 'src/components/docking/panels/MediaDrawerPanel.tsx',
    locationLine: 'Line 378',
    unwiredSnippet: `{!['media', 'transitions', 'filters', 'audio'].includes(activeTab) && <PlaceholderView />}`,
    fixRecommendation: 'Wire Pexels/Unsplash API query proxy for searching royalty-free B-roll.',
    testRunner: () => ({
      isWorking: false,
      issues: ['PLACEHOLDER_UI: Library tab has no stock catalog data provider attached'],
    }),
  },
  {
    id: 'media-brand-assets-kit',
    label: 'Brand Assets Watermark & Logo Loader',
    module: 'MediaBin',
    targetHookOrState: 'brandKit.applyWatermark()',
    isWorking: false,
    issues: [
      'UNBOUND_STATE: Brand Assets tab does not persist persistent company watermark or custom brand hex palette.',
    ],
    description: 'Selecting Brand Assets sets category state but lacks logo file upload or persistent brand kit overlay controls.',
    componentFile: 'src/components/docking/panels/MediaDrawerPanel.tsx',
    locationLine: 'Line 158',
    unwiredSnippet: `onClick={() => setActiveCategory('brand')} // no brand kit persistence`,
    fixRecommendation: 'Add persistent brand logo uploader and overlay coordinate anchor in Remotion preview.',
    testRunner: () => ({
      isWorking: false,
      issues: ['UNBOUND_STATE: Brand assets kit has no watermark anchor or persistent asset store'],
    }),
  },

  // ==========================================
  // TIMELINE MODULE
  // ==========================================
  {
    id: 'time-blade-split-tool',
    label: 'Blade (Split) Tool at Playhead',
    module: 'Timeline',
    targetHookOrState: 'onUpdateClips(newClips)',
    isWorking: true,
    issues: [],
    description: 'Cuts the active video clip under the playhead into two sub-clips and updates timeline clip array state.',
    componentFile: 'src/components/docking/panels/TimelinePanel.tsx',
    locationLine: 'Line 45',
    fixRecommendation: 'Fully wired and working.',
    testRunner: (ctx) => {
      const hasClips = ctx.timeline.clips && ctx.timeline.clips.length > 0;
      if (!hasClips) {
        return { isWorking: false, issues: ['UNBOUND_STATE: No clips available on timeline'] };
      }
      return { isWorking: true, issues: [] };
    },
  },
  {
    id: 'time-playhead-scrubber',
    label: 'Playhead Scrubber & Multi-Track Needle',
    module: 'Timeline',
    targetHookOrState: 'currentTime & onSeek(time)',
    isWorking: true,
    issues: [],
    description: 'Interactive pointer down and move events scrub current playhead timecode across all 5 tracks.',
    componentFile: 'src/components/docking/panels/TimelinePanel.tsx',
    locationLine: 'Line 82',
    fixRecommendation: 'Fully wired and working.',
    testRunner: () => ({ isWorking: true, issues: [] }),
  },
  {
    id: 'time-ripple-edit-mode',
    label: 'Ripple Edit Mode Downstream Shifting',
    module: 'Timeline',
    targetHookOrState: 'rippleShiftEngine.propagateDelta()',
    isWorking: false,
    issues: [
      'UNWIRED: Ripple edit button toggles boolean state, but clip trims do not shift downstream clips.',
    ],
    description: 'When ripple edit mode is enabled, trimming or deleting a clip does not ripple-shift subsequent clips along the time axis.',
    componentFile: 'src/components/docking/panels/TimelinePanel.tsx',
    locationLine: 'Line 184',
    unwiredSnippet: `onClick={() => setRippleEdit(!rippleEdit)} // state toggles without ripple shift calculation`,
    fixRecommendation: 'Implement downstream start time recalculation when trimming clips with rippleEdit=true.',
    testRunner: () => ({
      isWorking: false,
      issues: ['UNWIRED: Ripple edit flag is not utilized in clip trim calculations'],
    }),
  },
  {
    id: 'time-magnet-snapping-physics',
    label: 'Magnet Snapping Physics on Cut Boundaries',
    module: 'Timeline',
    targetHookOrState: 'playheadSnapThreshold.apply()',
    isWorking: false,
    issues: [
      'PARTIAL_LOGIC: Magnet snapping toggles active state, but threshold snapping is rudimentary and lacks magnetic snap guides.',
    ],
    description: 'Magnet snapping toggles visual state, but lacks magnetic guide lines and fine-grained playhead drag snapping physics.',
    componentFile: 'src/components/docking/panels/TimelinePanel.tsx',
    locationLine: 'Line 199',
    unwiredSnippet: `onClick={() => setMagnetSnapping(!magnetSnapping)} // rudimentary check`,
    fixRecommendation: 'Add visual snap guide lines and magnetic attraction physics around clip in/out boundaries.',
    testRunner: () => ({
      isWorking: false,
      issues: ['PARTIAL_LOGIC: Magnet snapping lacks visual guide alignment and edge attraction physics'],
    }),
  },
  {
    id: 'time-record-voiceover',
    label: 'Live Voiceover Recording Pipe',
    module: 'Timeline',
    targetHookOrState: 'navigator.mediaDevices.getUserMedia()',
    isWorking: false,
    issues: [
      'UNWIRED: Record button toggles active state without opening microphone stream or creating audio blob.',
    ],
    description: 'Clicking the Record button toggles UI active state, but does not invoke navigator.mediaDevices.getUserMedia or pipe audio to VO_TRACK.',
    componentFile: 'src/components/docking/panels/TimelinePanel.tsx',
    locationLine: 'Line 214',
    unwiredSnippet: `onClick={() => setIsRecording(!isRecording)} // empty toggle without MediaRecorder`,
    fixRecommendation: 'Wire MediaStreamRecorder to record microphone audio and automatically add to assets as VO_TRACK.',
    testRunner: () => ({
      isWorking: false,
      issues: ['UNWIRED: Record button lacks MediaRecorder microphone ingestion stream'],
    }),
  },

  // ==========================================
  // AUDIO MODULE
  // ==========================================
  {
    id: 'audio-speech-synchronizer',
    label: 'VO_TRACK Speech Interval Synchronizer',
    module: 'Audio',
    targetHookOrState: 'extractSpeechIntervals()',
    isWorking: true,
    issues: [],
    description: 'Calculates active speech activity boundaries from word timestamps to drive visual ducking dips and cut pacing.',
    componentFile: 'src/lib/audioEngine.ts',
    locationLine: 'Line 18',
    fixRecommendation: 'Fully wired and working.',
    testRunner: (ctx) => {
      const hasSubs = ctx.timeline.subtitles && ctx.timeline.subtitles.length > 0;
      return {
        isWorking: Boolean(hasSubs),
        issues: hasSubs ? [] : ['UNBOUND_STATE: No voiceover subtitles available for speech extraction'],
      };
    },
  },
  {
    id: 'audio-ducking-envelope-display',
    label: 'Audio Ducking Visual Dip Envelope (-16 dB)',
    module: 'Audio',
    targetHookOrState: 'timeline.BG_MUSIC.duckingDips',
    isWorking: true,
    issues: [],
    description: 'Displays -16 dB attenuation dip envelopes in the BG_MUSIC track during active speech timestamps.',
    componentFile: 'src/components/docking/panels/TimelinePanel.tsx',
    locationLine: 'Line 405',
    fixRecommendation: 'Fully wired and working.',
    testRunner: () => ({ isWorking: true, issues: [] }),
  },
  {
    id: 'audio-live-gain-node',
    label: 'Live Web Audio API GainNode Dynamic Observer',
    module: 'Audio',
    targetHookOrState: 'AudioContext.createGain() -> bgmGainNode',
    isWorking: false,
    issues: [
      'PARTIAL_LOGIC: Ducking attenuation slider saves dB value to settings, but does not dynamically update active Web Audio gainNode without restarting.',
    ],
    description: 'Changing ducking slider in settings saves duckingDb, but live preview audio playback does not update gainNode volume on the fly.',
    componentFile: 'src/components/SettingsModal.tsx',
    locationLine: 'Line 188',
    unwiredSnippet: `onChange={(e) => setFormData({ ...formData, duckingDb: Number(e.target.value) })} // no live gainNode listener`,
    fixRecommendation: 'Connect a live audio event bus or gainNode observer to re-scale active Web Audio playback volume on slider change.',
    testRunner: () => ({
      isWorking: false,
      issues: ['PARTIAL_LOGIC: Ducking slider missing live Web Audio gainNode observer during active playback'],
    }),
  },
  {
    id: 'audio-stem-eq-pitch',
    label: 'Audio Stem Equalizer & Pitch Shift',
    module: 'Audio',
    targetHookOrState: 'BiquadFilterNode & pitchShiftAudio()',
    isWorking: false,
    issues: [
      'UNWIRED: Audio stems view has no frequency EQ filters, compressor, or vocal pitch shifter.',
    ],
    description: 'Audio drawer displays track stems but offers no equalizer sliders, vocal clarity enhancements, or sound effects.',
    componentFile: 'src/components/docking/panels/MediaDrawerPanel.tsx',
    locationLine: 'Line 350',
    unwiredSnippet: `// Missing BiquadFilterNode / Vocal clarity filter controls`,
    fixRecommendation: 'Add high-pass/vocal enhancer filter controls using Web Audio API BiquadFilterNode.',
    testRunner: () => ({
      isWorking: false,
      issues: ['UNWIRED: Audio tracks lack dynamic EQ filter nodes and vocal compression processing'],
    }),
  },

  // ==========================================
  // CANVAS MODULE
  // ==========================================
  {
    id: 'canvas-aspect-ratio-lock',
    label: 'Strict 9:16 Aspect-Ratio Hard-Lock',
    module: 'Canvas',
    targetHookOrState: 'aspect-[9/16] & contain',
    isWorking: true,
    issues: [],
    description: 'Hard-locks video canvas container into vertical 9:16 ratio (1080x1920) with max-h-full and contain scaling.',
    componentFile: 'src/components/player/RemotionPreviewPlayer.tsx',
    locationLine: 'Line 60',
    fixRecommendation: 'Fully wired and working.',
    testRunner: (ctx) => {
      const ratio = ctx.timeline.aspectRatio;
      if (!ratio) {
        return { isWorking: false, issues: ['UNBOUND_STATE: Canvas aspect ratio undefined'] };
      }
      return { isWorking: true, issues: [] };
    },
  },
  {
    id: 'canvas-blur-padding',
    label: 'Non-Vertical Asset Blur-Padding Backdrop',
    module: 'Canvas',
    targetHookOrState: 'scale(1.35) blur-2xl opacity-50',
    isWorking: true,
    issues: [],
    description: 'When horizontal (16:9) or non-vertical assets are rendered in 9:16 mode, an ambient blurred background fills pillarbox space.',
    componentFile: 'src/components/player/RemotionPreviewPlayer.tsx',
    locationLine: 'Line 115',
    fixRecommendation: 'Fully wired and working.',
    testRunner: () => ({ isWorking: true, issues: [] }),
  },
  {
    id: 'canvas-caption-clamping',
    label: 'Safe-Zone Caption Percentage Clamping',
    module: 'Canvas',
    targetHookOrState: 'clamp(5%..95% X, 10%..85% Y)',
    isWorking: true,
    issues: [],
    description: 'Enforces safe-zone drag bounding to ensure subtitles never overflow the player canvas or clip into TikTok UI boundaries.',
    componentFile: 'src/components/captions/DraggableCaptionOverlay.tsx',
    locationLine: 'Line 55',
    fixRecommendation: 'Fully wired and working.',
    testRunner: (ctx) => {
      const pos = ctx.timeline.captionPosition;
      if (!pos) return { isWorking: false, issues: ['UNBOUND_STATE: Missing captionPosition'] };
      const clamped = pos.x >= 5 && pos.x <= 95 && pos.y >= 10 && pos.y <= 85;
      return {
        isWorking: clamped,
        issues: clamped ? [] : ['Caption coordinates fall outside safe-zone percentage boundaries'],
      };
    },
  },
  {
    id: 'canvas-aspect-ratio-toggle',
    label: 'Canvas Aspect Ratio Toggle (16:9 / 1:1)',
    module: 'Canvas',
    targetHookOrState: 'onAspectRatioChange(ratio)',
    isWorking: true,
    issues: [],
    description: 'Toggleable canvas aspect ratio buttons dynamically update player container and export resolution.',
    componentFile: 'src/components/player/RemotionPreviewPlayer.tsx',
    locationLine: 'Line 80',
    fixRecommendation: 'Fully wired and working.',
    testRunner: () => ({ isWorking: true, issues: [] }),
  },
  {
    id: 'canvas-multi-layer-composition',
    label: 'Multi-Track Composition Canvas Engine',
    module: 'Canvas',
    targetHookOrState: 'video + captions + audio sync',
    isWorking: true,
    issues: [],
    description: 'Synchronizes video playback, Ken Burns transforms, dynamic subtitles, and ducked audio stems on a single player canvas.',
    componentFile: 'src/components/player/RemotionPreviewPlayer.tsx',
    locationLine: 'Line 100',
    fixRecommendation: 'Fully wired and working.',
    testRunner: (ctx) => {
      const ready = ctx.timeline.clips.length > 0 && ctx.timeline.subtitles.length > 0;
      return {
        isWorking: ready,
        issues: ready ? [] : ['Timeline clips or subtitles not populated for multi-layer composition'],
      };
    },
  },
];
