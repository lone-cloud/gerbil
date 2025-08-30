export const APP_NAME = 'friendly-kobold';
export const PRODUCT_NAME = 'Friendly Kobold';

export const CONFIG_FILE_NAME = 'config.json';

export const UI = {
  HEADER_HEIGHT: 60,
} as const;

export const { HEADER_HEIGHT } = UI;

export const SERVER_READY_SIGNALS = {
  KOBOLDCPP: 'Please connect to custom endpoint at',
  SILLYTAVERN: 'SillyTavern is listening on',
} as const;

export * from './defaults';

export const GITHUB_API = {
  BASE_URL: 'https://api.github.com',
  KOBOLDCPP_REPO: 'LostRuins/koboldcpp',
  KOBOLDCPP_ROCM_REPO: 'YellowRoseCx/koboldcpp-rocm',
  FRIENDLY_KOBOLD_REPO: 'lone-cloud/friendly-kobold',
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
} as const;
