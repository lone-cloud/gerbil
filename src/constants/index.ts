export const PRODUCT_NAME = 'Gerbil';

export const CONFIG_FILE_NAME = 'config.json';

export const TITLEBAR_HEIGHT = '2.5rem';

export const STATUSBAR_HEIGHT = '1.5rem';

export const MODAL_STYLES_WITH_TITLEBAR = {
  overlay: {
    top: TITLEBAR_HEIGHT,
  },
  content: {
    marginTop: TITLEBAR_HEIGHT,
  },
} as const;

export const SERVER_READY_SIGNALS = {
  KOBOLDCPP: 'Please connect to custom endpoint at',
  SILLYTAVERN: 'SillyTavern is listening on',
  OPENWEBUI: 'Waiting for application startup.',
  COMFYUI: 'Starting server',
} as const;

export const DEFAULT_CONTEXT_SIZE = 4096;

export const DEFAULT_MODEL_URL =
  'https://huggingface.co/MaziyarPanahi/gemma-3-4b-it-GGUF/resolve/main/gemma-3-4b-it.Q8_0.gguf?download=true';

export const DEFAULT_AUTO_GPU_LAYERS = false;

export const SILLYTAVERN = {
  PORT: 3000,
  PROXY_PORT: 3001,
  get URL() {
    return `http://localhost:${this.PORT}`;
  },
  get PROXY_URL() {
    return `http://localhost:${this.PROXY_PORT}`;
  },
} as const;

export const OPENWEBUI = {
  PORT: 8080,
  get URL() {
    return `http://localhost:${this.PORT}`;
  },
} as const;

export const COMFYUI = {
  PORT: 8188,
  get URL() {
    return `http://localhost:${this.PORT}`;
  },
} as const;

export const GITHUB_API = {
  BASE_URL: 'https://api.github.com',
  KOBOLDCPP_REPO: 'LostRuins/koboldcpp',
  KOBOLDCPP_ROCM_REPO: 'YellowRoseCx/koboldcpp-rocm',
  GERBIL_REPO: 'lone-cloud/gerbil',
  get LATEST_RELEASE_URL() {
    return `${this.BASE_URL}/repos/${this.KOBOLDCPP_REPO}/releases/latest`;
  },
  get ALL_RELEASES_URL() {
    return `${this.BASE_URL}/repos/${this.KOBOLDCPP_REPO}/releases`;
  },
  get ROCM_LATEST_RELEASE_URL() {
    return `${this.BASE_URL}/repos/${this.KOBOLDCPP_ROCM_REPO}/releases/latest`;
  },
} as const;

export const ASSET_SUFFIXES = {
  ROCM: 'rocm',
  NOCUDA: 'nocuda',
  OLDPC: 'oldpc',
} as const;

export const ROCM = {
  LINUX: {
    BINARY_NAME: 'koboldcpp-linux-x64-rocm',
    DOWNLOAD_URL: 'https://koboldai.org/cpplinuxrocm',
    SIZE_BYTES_APPROX: 1024 * 1024 * 1024,
  },
} as const;

export const FRONTENDS = {
  KOBOLDAI_LITE: 'KoboldAI Lite',
  STABLE_UI: 'Stable UI',
  SILLYTAVERN: 'SillyTavern',
  OPENWEBUI: 'Open WebUI',
  COMFYUI: 'ComfyUI',
} as const;

export const ZOOM = {
  MIN_LEVEL: -5,
  MAX_LEVEL: 5,
  MIN_PERCENTAGE: 25,
  MAX_PERCENTAGE: 500,
  DEFAULT_LEVEL: 0,
  DEFAULT_PERCENTAGE: 100,
} as const;
