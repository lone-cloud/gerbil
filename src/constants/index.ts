export const PRODUCT_NAME = 'Gerbil';

export const CONFIG_FILE_NAME = 'config.json';

export const TITLEBAR_HEIGHT = '2.5rem';

export const STATUSBAR_HEIGHT = '1.5rem';

export const SERVER_READY_SIGNALS = {
  KOBOLDCPP: 'Please connect to custom endpoint at',
  SILLYTAVERN: 'SillyTavern is listening on',
  OPENWEBUI: 'Waiting for application startup.',
} as const;

export const DEFAULT_CONTEXT_SIZE = 4096;

export const DEFAULT_MODEL_URL =
  'https://huggingface.co/MaziyarPanahi/gemma-3-4b-it-GGUF/resolve/main/gemma-3-4b-it.Q8_0.gguf';

export const DEFAULT_AUTO_GPU_LAYERS = true;

export const SILLYTAVERN = {
  PORT: 3000,
  PROXY_PORT: 3001,
  get URL() {
    return `http://127.0.0.1:${this.PORT}`;
  },
  get PROXY_URL() {
    return `http://127.0.0.1:${this.PROXY_PORT}`;
  },
} as const;

export const OPENWEBUI = {
  PORT: 8080,
  get URL() {
    return `http://127.0.0.1:${this.PORT}`;
  },
} as const;

export const GITHUB_API = {
  BASE_URL: 'https://api.github.com',
  GITHUB_BASE_URL: 'https://github.com',
  KOBOLDCPP_REPO: 'LostRuins/koboldcpp',
  KOBOLDCPP_ROCM_REPO: 'YellowRoseCx/koboldcpp-rocm',
  GERBIL_REPO: 'lone-cloud/gerbil',
  get LATEST_RELEASE_URL() {
    return `${this.BASE_URL}/repos/${this.KOBOLDCPP_REPO}/releases/latest` as const;
  },
  get ALL_RELEASES_URL() {
    return `${this.BASE_URL}/repos/${this.KOBOLDCPP_REPO}/releases` as const;
  },
  get ROCM_LATEST_RELEASE_URL() {
    return `${this.BASE_URL}/repos/${this.KOBOLDCPP_ROCM_REPO}/releases/latest` as const;
  },
  get GERBIL_GITHUB_URL() {
    return `${this.GITHUB_BASE_URL}/${this.GERBIL_REPO}` as const;
  },
  get GERBIL_LATEST_RELEASE_URL() {
    return `${this.BASE_URL}/repos/${this.GERBIL_REPO}/releases/latest` as const;
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
} as const;

export const ZOOM = {
  MIN_LEVEL: -3,
  MAX_LEVEL: 3,
  MIN_PERCENTAGE: 25,
  MAX_PERCENTAGE: 300,
  DEFAULT_LEVEL: 0,
  DEFAULT_PERCENTAGE: 100,
} as const;
