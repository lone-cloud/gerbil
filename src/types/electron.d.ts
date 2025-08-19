import type {
  CPUCapabilities,
  GPUCapabilities,
  BasicGPUInfo,
  HardwareInfo,
  PlatformInfo,
} from '@/types/hardware';

interface GitHubAsset {
  name: string;
  browser_download_url: string;
  size: number;
  created_at: string;
}

export interface GitHubRelease {
  tag_name: string;
  name: string;
  published_at: string;
  body: string;
  html_url: string;
  assets: GitHubAsset[];
}

export interface UpdateInfo {
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

export interface InstalledVersion {
  version: string;
  path: string;
  type: 'github' | 'rocm';
  filename: string;
  size?: number;
}

export interface DownloadItem {
  name: string;
  url: string;
  size: number;
  version?: string;
  type: 'asset' | 'rocm';
}

export interface KoboldAPI {
  getInstalledVersion: () => Promise<string | undefined>;
  getInstalledVersions: () => Promise<InstalledVersion[]>;
  getCurrentVersion: () => Promise<InstalledVersion | null>;
  getCurrentBinaryInfo: () => Promise<{
    path: string;
    filename: string;
  } | null>;
  setCurrentVersion: (version: string) => Promise<boolean>;
  getVersionFromBinary: (binaryPath: string) => Promise<string | null>;
  getLatestRelease: () => Promise<DownloadItem[]>;
  getPlatform: () => Promise<PlatformInfo>;
  detectGPU: () => Promise<BasicGPUInfo>;
  detectCPU: () => Promise<CPUCapabilities>;
  detectGPUCapabilities: () => Promise<GPUCapabilities>;
  detectROCm: () => Promise<{ supported: boolean; devices: string[] }>;
  detectAllCapabilities: () => Promise<HardwareInfo>;
  detectBackendSupport: (binaryPath: string) => Promise<{
    rocm: boolean;
    vulkan: boolean;
    clblast: boolean;
    noavx2: boolean;
    failsafe: boolean;
    cuda: boolean;
  }>;
  getAvailableBackends: (
    binaryPath: string,
    hardwareCapabilities: GPUCapabilities
  ) => Promise<Array<{ value: string; label: string; devices?: string[] }>>;
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
  getROCmDownload: () => Promise<DownloadItem | null>;
  checkForUpdates: () => Promise<UpdateInfo | null>;
  getLatestReleaseWithStatus: () => Promise<ReleaseWithStatus | null>;
  launchKoboldCpp: (
    args?: string[],
    configFilePath?: string
  ) => Promise<{ success: boolean; pid?: number; error?: string }>;
  getConfigFiles: () => Promise<
    Array<{ name: string; path: string; size: number }>
  >;
  saveConfigFile: (
    configName: string,
    configData: {
      gpulayers?: number;
      contextsize?: number;
      model_param?: string;
      port?: number;
      host?: string;
      multiuser?: number;
      multiplayer?: boolean;
      remotetunnel?: boolean;
      nocertify?: boolean;
      websearch?: boolean;
      noshift?: boolean;
      flashattention?: boolean;
      noavx2?: boolean;
      failsafe?: boolean;
      usecuda?: boolean;
      usevulkan?: boolean;
      useclblast?: boolean;
      sdmodel?: string;
      sdt5xxl?: string;
      sdclipl?: string;
      sdclipg?: string;
      sdphotomaker?: string;
      sdvae?: string;
      [key: string]: unknown;
    }
  ) => Promise<boolean>;
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
  onVersionsUpdated: (callback: () => void) => () => void;
  onKoboldOutput: (callback: (data: string) => void) => () => void;
  removeAllListeners: (channel: string) => void;
}

export interface AppAPI {
  getVersion: () => Promise<string>;
  openExternal: (url: string) => Promise<void>;
}

export interface ConfigAPI {
  get: (key: string) => Promise<unknown>;
  set: (key: string, value: unknown) => Promise<void>;
}

export interface LogsAPI {
  logError: (message: string, error?: Error) => Promise<void>;
}

declare global {
  interface Window {
    electronAPI: {
      kobold: KoboldAPI;
      app: AppAPI;
      config: ConfigAPI;
      logs: LogsAPI;
    };
  }
}
