# Copilot Instructions for Gerbil

## Hard Rules

- **NEVER use `console.*`** — blocked by oxlint. Use `logError()` from `@/utils/node/logging` (main process) or `window.electronAPI.logs.logError()` (renderer)
- **Always use absolute imports**: `import { X } from '@/components/X'`
- **Never add explicit return types** — rely on TypeScript inference
- **Never create tests, docs, or GitHub workflows**
- **Move helper functions** out of component files into `src/utils/`

## What Gerbil Is

Gerbil is an Electron desktop app that acts as a launcher and GUI for [KoboldCpp](https://github.com/LostRuins/koboldcpp). It is **not** a new LLM backend — it wraps KoboldCpp and makes it usable without touching the terminal.

**The problem it solves**: KoboldCpp is an excellent all-in-one local LLM backend (text gen, image gen, multimodal, agents) but its own launcher UI is bad. Gerbil replaces and significantly improves that launcher.

**Gerbil vs KoboldCpp's launcher**: Gerbil adds auto binary download, GPU auto-detection (CUDA/ROCm/Vulkan/Metal), image gen presets (FLUX, Chroma, Z-Image, Qwen), HuggingFace model search/download, SillyTavern and OpenWebUI auto-launch, config save/load, real-time system monitoring, Cloudflare tunnel support, and a proper desktop experience.

## User Base

- People who want to run LLMs locally with real control over the backend
- SillyTavern users (roleplay/character AI) — Gerbil auto-launches ST alongside KoboldCpp
- Image generation users — Gerbil has first-class image gen with 4 presets
- Power users who want GPU acceleration configured correctly without guesswork

## Stack

Electron + React + Zustand + Mantine + TypeScript + pnpm + oxlint. No test framework.

## Validation

Always run after making changes:

```sh
pnpm check   # oxlint + oxfmt (lint + format check)
```

Fix lint/format issues with `pnpm fix`. No test suite exists.

## Gerbil's Role: KoboldCpp Orchestrator

Gerbil is a manager and orchestrator for KoboldCpp. It doesn't implement LLM inference — it configures, launches, monitors, and wraps KoboldCpp. KoboldCpp releases monthly updates that frequently add new CLI flags and capabilities.

**How KoboldCpp flags surface in Gerbil:**

1. **Promoted to UI** — High-value flags get a proper control (checkbox, slider, file picker) in the Launch screen tabs. These live in `launchConfig` store and are passed as CLI args to KoboldCpp at launch. They must be added to `UI_COVERED_ARGS` in `CommandLineArgumentsModal.tsx` so they're not duplicated in the modal.

2. **Available in the arguments modal** — Everything else is accessible via `CommandLineArgumentsModal` (`src/components/screens/Launch/CommandLineArgumentsModal.tsx`). This modal contains a hardcoded `COMMAND_LINE_ARGUMENTS` array with every KoboldCpp flag, its description, type, category, and aliases. Users can search and add any flag to the "Additional Arguments" field. These are stored as `additionalArguments` in `KoboldConfig`.

**When KoboldCpp adds new flags:** Add entries to `COMMAND_LINE_ARGUMENTS` in `CommandLineArgumentsModal.tsx`. If a flag deserves first-class UI treatment, also wire it into the launch config store, the relevant Launch tab, and add it to `UI_COVERED_ARGS`.

**`UI_COVERED_ARGS`** is a `Set<string>` at the top of `CommandLineArgumentsModal.tsx` — it lists all flags already exposed by the UI so they're filtered out of the modal. Always keep this in sync when promoting a flag to the UI.

## App Structure

**Screen flow**: Welcome → Download → Launch (tabs: General/Performance/Advanced/Image Gen/Network/Config) → Interface (tabs: Terminal/Chat-Text/Chat-Image)

**Supported GPUs**: CUDA, ROCm (via YellowRoseCx fork), Vulkan, Metal (macOS), CPU fallback

**Frontends**: KoboldAI Lite, llama.cpp (embedded in KoboldCpp), SillyTavern (localhost:3000, needs Node.js), OpenWebUI (localhost:8080, needs uv)

**Image gen presets**: FLUX.1-dev, Chroma-unlocked, Z-Image-Turbo, Qwen2.5-VL-7B (image edit)

**CLI mode**: headless binary execution — requires prior GUI setup to configure binary path

## Source Layout

```
src/
├── main/               # Electron main process (Node.js)
│   ├── index.ts        # Entry: routes to CLI or GUI mode
│   ├── gui.ts          # GUI init: window, tray, IPC, lifecycle
│   ├── cli.ts          # Headless mode: spawn binary, pipe stdio
│   ├── ipc.ts          # All ipcMain.handle/on registrations
│   └── modules/        # Feature domains
│       ├── config.ts           # Settings file (~/.config/Gerbil/config.json)
│       ├── hardware.ts         # GPU/CPU detection
│       ├── monitoring.ts       # Real-time CPU/GPU/RAM metrics
│       ├── tray.ts             # System tray icon & menu
│       ├── window.ts           # Main window creation & lifecycle
│       ├── auto-updater.ts     # Electron auto-updater
│       ├── dependencies.ts     # Check npm/uv/npx availability
│       ├── sillytavern.ts      # Auto-launch SillyTavern
│       ├── openwebui.ts        # Auto-launch OpenWebUI
│       └── koboldcpp/          # KoboldCpp-specific
│           ├── acceleration.ts # GPU acceleration detection
│           ├── analyze.ts      # GGUF model analysis
│           ├── backend.ts      # Installed binary management
│           ├── config.ts       # Config file save/load
│           ├── download.ts     # Binary download from GitHub
│           ├── launcher/       # Spawn KoboldCpp + frontends
│           ├── model-download.ts # Local model file detection
│           ├── proxy.ts        # Reverse proxy for KoboldCpp
│           └── tunnel.ts       # Cloudflare tunnel management
├── preload/
│   └── index.ts        # contextBridge: exposes electronAPI to renderer
├── components/
│   ├── App/            # App shell: routing, titlebar, statusbar, modals
│   ├── screens/        # Full-screen views (Welcome, Download, Launch, Interface)
│   ├── settings/       # Settings modal tabs (General, Appearance, Backends, etc.)
│   ├── Notepad/        # Floating notepad widget
│   └── *.tsx           # Reusable Mantine wrappers (Select, Modal, Switch, etc.)
├── stores/             # Zustand state
│   ├── launchConfig.ts     # KoboldCpp launch parameters (model, GPU layers, flags)
│   ├── preferences.ts      # UI prefs (theme, frontend choice, monitoring)
│   ├── koboldBackends.ts   # Download state + installed backend versions
│   └── notepad.ts          # Notepad state (tabs, content, position)
├── hooks/              # Custom React hooks
├── utils/
│   ├── *.ts            # Renderer-safe utilities (format, platform, version, etc.)
│   └── node/           # Main-process-only utilities (fs, gpu, vram, logging, etc.)
├── types/
│   ├── index.d.ts      # Core types: Screen, InterfaceTab, Acceleration, ModelParamType, etc.
│   ├── electron.d.ts   # window.electronAPI interface (all renderer-accessible APIs)
│   ├── ipc.d.ts        # IPC channel names + payload types
│   └── hardware.d.ts   # GPU/CPU type definitions
└── constants/
    ├── index.ts            # App-wide constants: URLs, dimensions, defaults, signals
    ├── imageModelPresets.ts # Image gen presets (FLUX, Chroma, Z-Image, Qwen)
    └── notepad.ts          # Notepad defaults
```

## IPC Pattern

Main ↔ renderer communicate through a typed bridge. **Never call Node APIs directly from renderer.**

**Define** the channel in `src/types/ipc.d.ts`:

```typescript
export type IPCChannel = 'my-channel' | ...
export interface IPCChannelPayloads { 'my-channel': [arg: string] }
```

**Handle** in `src/main/ipc.ts`:

```typescript
ipcMain.handle('domain:action', async (_event, arg: string) => { ... })
ipcMain.on('domain:action', (_event, arg: string) => { ... })  // fire-and-forget
```

**Expose** in `src/preload/index.ts` via `contextBridge.exposeInMainWorld('electronAPI', { ... })`:

```typescript
myDomain: {
  doThing: (arg: string) => ipcRenderer.invoke('domain:action', arg),
  onEvent: (cb: (data: string) => void) => {
    ipcRenderer.on('my-channel', (_e, data) => cb(data))
    return () => ipcRenderer.removeAllListeners('my-channel')  // cleanup
  }
}
```

**Type** it in `src/types/electron.d.ts` so renderer gets full type-checking on `window.electronAPI`.

**Use** in renderer:

```typescript
const result = await window.electronAPI.myDomain.doThing('arg')
const cleanup = window.electronAPI.myDomain.onEvent((data) => { ... })
useEffect(() => cleanup, [])
```

Channel naming: `domain:action` (e.g., `kobold:launchKoboldCpp`, `config:set`).

## Zustand Store Pattern

```typescript
// src/stores/myStore.ts
interface MyStore {
  value: string;
  setValue: (v: string) => void;
  loadFromConfig: () => Promise<void>; // if persisted
}

export const useMyStore = create<MyStore>((set) => ({
  value: '',
  setValue: (v) => {
    set({ value: v });
    window.electronAPI.config.set('myKey', v); // persist if needed
  },
  loadFromConfig: async () => {
    const saved = await window.electronAPI.config.get('myKey');
    if (saved) set({ value: saved });
  },
}));
```

Stores load persisted state on init: `void useMyStore.getState().loadFromConfig()` called in `App/index.tsx`.

## Component Conventions

- Reusable components live in `src/components/` and wrap Mantine with sensible defaults (see `Select.tsx`, `Modal.tsx`, `Switch.tsx`)
- Screen components live in `src/components/screens/`
- Settings tabs live in `src/components/settings/`
- All imports from Mantine: `import { Button } from '@mantine/core'`

## Key Types to Know

```typescript
type Screen = 'welcome' | 'download' | 'launch' | 'interface'
type InterfaceTab = 'terminal' | 'chat-text' | 'chat-image'
type Acceleration = 'cpu' | 'cuda' | 'rocm' | 'vulkan' | ...
type ModelParamType = 'model' | 'sdmodel' | 'sdt5xxl' | 'sdvae' | ...
type FrontendPreference = 'koboldcpp' | 'llamacpp' | 'sillytavern' | 'openwebui'
```

## Key Constants (`src/constants/index.ts`)

- `SERVER_READY_SIGNALS` — strings that signal KoboldCpp/SillyTavern/OpenWebUI are ready
- `SILLYTAVERN`, `OPENWEBUI` — host/port/URL constants
- `GITHUB_API` — KoboldCpp release API URLs
- `DEFAULT_CONTEXT_SIZE`, `DEFAULT_AUTO_GPU_LAYERS` — launch defaults

## Utilities Reference

| File                    | What it exports                                                                   |
| ----------------------- | --------------------------------------------------------------------------------- |
| `utils/format.ts`       | `formatBytes`, `formatDeviceName`, `formatDate`                                   |
| `utils/platform.ts`     | `filterAssetsByPlatform`, `isAssetCompatibleWithPlatform`                         |
| `utils/version.ts`      | `compareVersions`, `getDisplayNameFromPath`                                       |
| `utils/validation.ts`   | `getInputValidationState` (path validation)                                       |
| `utils/terminal.ts`     | `handleTerminalOutput`, `processTerminalContent` (ANSI handling)                  |
| `utils/interface.ts`    | `getDefaultInterfaceTab`, `getAvailableInterfaceOptions`, `getTunnelInterfaceUrl` |
| `utils/logger.ts`       | `logError`, `withRetry`, `safeExecute`                                            |
| `utils/node/logging.ts` | Main process `logError`                                                           |
| `utils/node/fs.ts`      | `readJsonFile`, `ensureDir`, `pathExists`                                         |
| `utils/node/gpu.ts`     | GPU capability detection                                                          |
| `utils/node/vram.ts`    | `calculateOptimalGpuLayers`                                                       |
| `utils/node/path.ts`    | `getConfigDir`, `openUrl`                                                         |
