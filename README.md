# 🎬 AutoCut Studio

> **Web-based automated video editing application.** Upload raw media assets, tag them with unique code IDs, provide natural-language script instructions, and automatically render a fully edited 60-second vertical video (9:16) with zero manual timeline editing.

[![Next.js](https://img.shields.io/badge/Next.js-16.3-black?style=flat&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2-blue?style=flat&logo=react)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38bdf8?style=flat&logo=tailwindcss)](https://tailwindcss.com/)
[![Zod](https://img.shields.io/badge/Zod-Schema_Validated-3e67d6?style=flat)](https://zod.dev/)
[![Remotion](https://img.shields.io/badge/Remotion-Player-ff4757?style=flat)](https://www.remotion.dev/)

---

## 🚀 Key Features

### 📦 Module 1: Media Bin & Asset Tagging (Left Panel)
- **Multi-Format Ingestion**: Drag-and-drop or file picker for MP4, MOV, PNG, JPG, MP3, and WAV.
- **Automated Asset Registry**: Automatically parses and tags files with unique codes:
  - Videos: `VID_01`, `VID_02`, etc. (with duration and canvas frame thumbnail extraction).
  - Images: `IMG_01`, `IMG_02`, etc. (with resolution metadata).
  - Audio: `VO_TRACK` (voiceover narration) and `BG_MUSIC` (background beat).
- **Interactive Badges**: Color-coded badges with one-click copy and quick insertion into prompt scripts.
- **Pre-Loaded Sample Pack**: Royalty-free videos, studio images, voiceover audio, and synthwave music ready for instant 1-click testing.

### 🧠 Module 2: Prompt & Instruction Console (Center Panel)
- **Natural-Language Director**: Instruct sequence pacing, scene focus, transitions, and mood directly in plain English referencing asset codes.
- **Preset Blueprints**:
  - ⚡ *Viral Hooks & Fast Cuts (MrBeast Style)*
  - 🎬 *Cinematic Aesthetic Montage*
  - 🚀 *Cyberpunk Tech Reel*
  - 🎙️ *High-Retention Storyteller*
- **Pacing Selector**: Fast (3-5s clips), Balanced (5-7s clips), Cinematic (7-10s clips).
- **Multi-Provider AI Director**:
  - Google Gemini API (`gemini-2.5-flash`) with structured JSON mode.
  - OpenAI API (`gpt-4o-mini`).
  - Built-in **Smart AI Director** (instant, deterministic, zero API keys required).
- **Zod Schema Validation**: Guarantees strictly compliant 60.0-second vertical cuts with in/out timestamps, motion effects, and color grading.

### 🔊 Module 3: Automated Audio & Subtitle Engine
- **Automated -16 dB Audio Ducking**: Smoothly attenuates background music by -16 dB during speech segments with attack and release smoothing to avoid audio fluttering.
- **Live Ducking Badge**: Visual indicator lights up whenever ducking attenuation is active.
- **Dynamic Auto-Captions**: Word-by-word synced highlight (Alex Hormozi / MrBeast punchy style) with animated pop scale, heavy stroke outline, and multiple themes (*Viral Pop*, *Neon Cyber*, *Minimal White*, *Classic Box*).

### 🖥️ Module 4: Video Preview & Export (Right Panel)
- **Interactive 9:16 Vertical Player**: Frame-accurate playback with video trimming (`sourceStart`), Ken Burns motion transforms on static images (`zoom-in`, `zoom-out`, `pan-left`, `pulse`), CSS color grading LUTs (`cyber`, `vintage`, `noir`, `high-contrast`), and transitions (`whip-pan`, `zoom-snap`, `glitch`, `cross-dissolve`).
- **TikTok / Instagram Reels Safe Zone Overlay**: Grid visualizer showing creator button safe areas.
- **Multi-Track Visual Timeline**: NLE tracks showing cuts, audio ducking dips, and subtitle bounds with a draggable playhead.
- **JSON Inspector Drawer**: Inspect, copy, download, or edit the raw timeline schema with live re-rendering.
- **1080x1920 MP4 Video Exporter**: Browser-based Canvas + Web Audio + MediaRecorder render pipeline with a live progress bar and direct download link.

---

## 🛠️ Tech Stack

- **Framework**: Next.js 16 (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS v4, Lucide Icons
- **Video & Audio Processing**: Remotion Player (`@remotion/player`), HTML5 Canvas, Web Audio API, MediaRecorder
- **Validation**: Zod
- **AI Integrations**: Gemini API, OpenAI GPT-4o, Whisper API

---

## 🏁 Getting Started

### 1. Clone the repository
```bash
git clone https://github.com/ahmadtilllast786-cpu/autocut-studio.git
cd autocut-studio
```

### 2. Install dependencies
```bash
npm install
```

### 3. Run development server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Build for production
```bash
npm run build
npm run start
```

---

## 📝 License

MIT License. Feel free to use and adapt for your video automation workflows!
