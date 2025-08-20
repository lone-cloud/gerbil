export const APP_NAME = 'friendly-kobold';

export const CONFIG_FILE_NAME = 'config.json';

export const UI = {
  HEADER_HEIGHT: 60,
} as const;

export const { HEADER_HEIGHT } = UI;

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

export const KOBOLDAI_URLS = {
  STANDARD_DOWNLOAD: 'https://koboldai.org/cpp',
  ROCM_DOWNLOAD: 'https://koboldai.org/cpplinuxrocm',
  DOMAIN: 'koboldai.org',
} as const;

export const ROCM = {
  BINARY_NAME: 'koboldcpp-linux-x64-rocm',
  DOWNLOAD_URL: KOBOLDAI_URLS.ROCM_DOWNLOAD,
  SIZE_BYTES_APPROX: 1024 * 1024 * 1024,
} as const;
