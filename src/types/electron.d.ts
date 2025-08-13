interface GitHubAsset {
  name: string;
  browser_download_url: string;
  size: number;
  created_at: string;
}

interface GitHubRelease {
  tag_name: string;
  name: string;
  published_at: string;
  body: string;
  assets: GitHubAsset[];
}

interface UpdateInfo {
  currentVersion: string;
  latestVersion: string;
  releaseInfo: GitHubRelease;
  hasUpdate: boolean;
}

interface ReleaseWithStatus {
  release: GitHubRelease;
  availableAssets: Array<{
    asset: GitHubAsset;
    isDownloaded: boolean;
    installedVersion?: string;
  }>;
}

interface InstalledVersion {
  version: string;
  path: string;
  type: 'github' | 'rocm';
  downloadDate: string;
  filename: string;
}

interface ROCmDownload {
  name: string;
  url: string;
  size: number;
  type: 'rocm';
}

export interface KoboldAPI {
  isInstalled: () => Promise<boolean>;
  getInstalledVersion: () => Promise<string | undefined>;
  getInstalledVersions: () => Promise<InstalledVersion[]>;
  getCurrentVersion: () => Promise<InstalledVersion | null>;
  setCurrentVersion: (version: string) => Promise<boolean>;
  getVersionFromBinary: (binaryPath: string) => Promise<string | null>;
  getLatestRelease: () => Promise<GitHubRelease>;
  getAllReleases: () => Promise<GitHubRelease[]>;
  getPlatform: () => Promise<{ platform: string; arch: string }>;
  detectGPU: () => Promise<{
    hasAMD: boolean;
    hasNVIDIA: boolean;
    gpuInfo: string[];
  }>;
  getCurrentInstallDir: () => Promise<string>;
  selectInstallDirectory: () => Promise<string | null>;
  downloadRelease: (
    asset: GitHubAsset
  ) => Promise<{ success: boolean; path?: string; error?: string }>;
  downloadROCm: () => Promise<{
    success: boolean;
    path?: string;
    error?: string;
  }>;
  getROCmDownload: () => Promise<ROCmDownload | null>;
  checkForUpdates: () => Promise<UpdateInfo | null>;
  getLatestReleaseWithStatus: () => Promise<ReleaseWithStatus | null>;
  launchKoboldCpp: (
    args?: string[],
    configFilePath?: string
  ) => Promise<{ success: boolean; pid?: number; error?: string }>;
  openInstallDialog: () => Promise<{ success: boolean; path?: string }>;
  getConfigFiles: () => Promise<
    Array<{ name: string; path: string; size: number }>
  >;
  getSelectedConfig: () => Promise<string | null>;
  setSelectedConfig: (configName: string) => Promise<boolean>;
  parseConfigFile: (filePath: string) => Promise<{
    gpulayers?: number;
    contextsize?: number;
    model_param?: string;
    [key: string]: unknown;
  } | null>;
  selectModelFile: () => Promise<string | null>;
  stopKoboldCpp: () => void;
  confirmEject: () => Promise<boolean>;
  onDownloadProgress: (callback: (progress: number) => void) => void;
  onUpdateAvailable: (callback: (updateInfo: UpdateInfo) => void) => void;
  onInstallDirChanged: (callback: (newPath: string) => void) => () => void;
  onKoboldOutput: (callback: (data: string) => void) => () => void;
  removeAllListeners: (channel: string) => void;
}

export interface AppAPI {
  getVersion: () => Promise<string>;
  openExternal: (url: string) => Promise<void>;
}

export interface ConfigAPI {
  getServerOnly: () => Promise<boolean>;
  setServerOnly: (serverOnly: boolean) => Promise<void>;
  getModelPath: () => Promise<string | null>;
  setModelPath: (path: string) => Promise<void>;
  get: (key: string) => Promise<unknown>;
  set: (key: string, value: unknown) => Promise<void>;
}

declare global {
  interface Window {
    electronAPI: {
      kobold: KoboldAPI;
      app: AppAPI;
      config: ConfigAPI;
    };
  }
}
