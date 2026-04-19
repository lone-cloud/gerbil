# Copilot Instructions for Gerbil

- **NEVER use console.\* calls** - they are blocked by ESLint. Use `logError()` from `@/utils/node/logging` (main process) or `window.electronAPI.logs.logError()` (renderer)
- Always use absolute imports: `import { X } from '@/components/X'`
- Never add explicit return types to functions - rely on TypeScript inference
- Never create tests, docs, or GitHub workflows
- Move helper functions out of component files into separate utility files

## What Gerbil Is

Gerbil is an Electron desktop app that acts as a launcher and GUI for [KoboldCpp](https://github.com/LostRuins/koboldcpp). It is **not** a new LLM backend — it wraps KoboldCpp and makes it usable without touching the terminal.

**The problem it solves**: KoboldCpp is an excellent all-in-one local LLM backend (text gen, image gen, multimodal, agents) but its own launcher UI is bad. Gerbil replaces and significantly improves that launcher.

**Gerbil vs Ollama**: Ollama is simpler but far more limited. Gerbil targets users who want KoboldCpp's power (image gen, 80+ config options, SillyTavern/OpenWebUI integration) without fighting a bad UI or memorizing CLI flags.

**Gerbil vs KoboldCpp's launcher**: Gerbil adds auto binary download, GPU auto-detection (CUDA/ROCm/Vulkan/Metal), image gen presets (FLUX, Chroma, Z-Image, Qwen), HuggingFace model search/download, SillyTavern and OpenWebUI auto-launch, config save/load, real-time system monitoring, Cloudflare tunnel support, and a proper desktop experience.

## User Base

- People who want to run LLMs locally with real control over the backend
- SillyTavern users (roleplay/character AI) — Gerbil auto-launches ST alongside KoboldCpp
- Image generation users — Gerbil has first-class image gen with 4 presets
- Power users who want GPU acceleration configured correctly without guesswork

## Key Technical Facts

- Stack: Electron 41, React 19, Zustand 5, Mantine 9, pnpm, TypeScript, oxlint
- Screens flow: Welcome → Download → Launch (tabs: General/Performance/Advanced/Image Gen/Network/Config) → Interface (tabs: Terminal/Chat-Text/Chat-Image)
- Supported GPUs: CUDA, ROCm (via YellowRoseCx fork), Vulkan, Metal (macOS), CPU fallback
- Frontends: KoboldAI Lite, llama.cpp (embedded in KoboldCpp), SillyTavern (localhost:3000, needs Node.js), OpenWebUI (localhost:8080, needs uv)
- Image gen presets: FLUX.1-dev, Chroma-unlocked, Z-Image-Turbo, Qwen2.5-VL-7B (image edit)
- Default model: gemma-3-4b-it Q8_0 from HuggingFace
- CLI mode: headless binary execution — requires prior GUI setup to configure binary path
- No telemetry, fully local after initial binary download
