export const APP_NAME = 'friendly-kobold';

export const CONFIG_FILE_NAME = 'config.json';

export const DIALOG_TITLES = {
  SELECT_INSTALL_DIR: 'Select the Friendly Kobold Installation Directory',
} as const;

export const GITHUB_API = {
  BASE_URL: 'https://api.github.com',
  KOBOLDCPP_REPO: 'LostRuins/koboldcpp',
  get LATEST_RELEASE_URL() {
    return `${this.BASE_URL}/repos/${this.KOBOLDCPP_REPO}/releases/latest`;
  },
  get ALL_RELEASES_URL() {
    return `${this.BASE_URL}/repos/${this.KOBOLDCPP_REPO}/releases`;
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
} as const;

export const ROCM = {
  BINARY_NAME: 'koboldcpp-linux-x64-rocm',
  DOWNLOAD_URL: KOBOLDAI_URLS.ROCM_DOWNLOAD,
  ERROR_MESSAGE: 'ROCm version is only available for Linux',
  SIZE_BYTES: 1024 * 1024 * 1024, // 1GB
} as const;
