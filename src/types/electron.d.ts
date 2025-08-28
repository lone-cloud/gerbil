import type {
  CPUCapabilities,
  GPUCapabilities,
  BasicGPUInfo,
  PlatformInfo,
  GPUMemoryInfo,
} from '@/types/hardware';
import type { BackendOption } from '@/types';

export interface GitHubAsset {
  name: string;
  browser_download_url: string;
  size: number;
  created_at: string;
  isUpdate?: boolean;
  wasCurrentBinary?: boolean;
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

export interface ReleaseWithStatus {
  release: GitHubRelease;
  availableAssets: {
    asset: GitHubAsset;
    isDownloaded: boolean;
    installedVersion?: string;
  }[];
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
  getInstalledVersions: () => Promise<InstalledVersion[]>;
  getCurrentBinaryInfo: () => Promise<{
    path: string;
    filename: string;
  } | null>;
  setCurrentVersion: (version: string) => Promise<boolean>;
  getLatestRelease: () => Promise<DownloadItem[]>;
  getPlatform: () => Promise<PlatformInfo>;
  detectGPU: () => Promise<BasicGPUInfo>;
  detectCPU: () => Promise<CPUCapabilities>;
  detectGPUCapabilities: () => Promise<GPUCapabilities>;
  detectGPUMemory: () => Promise<GPUMemoryInfo[]>;
  detectROCm: () => Promise<{ supported: boolean; devices: string[] }>;
  detectBackendSupport: () => Promise<{
    rocm: boolean;
    vulkan: boolean;
    clblast: boolean;
    noavx2: boolean;
    failsafe: boolean;
    cuda: boolean;
  } | null>;
  getAvailableBackends: (includeDisabled?: boolean) => Promise<BackendOption[]>;
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
  getLatestReleaseWithStatus: () => Promise<ReleaseWithStatus | null>;
  launchKoboldCpp: (
    args?: string[]
  ) => Promise<{ success: boolean; pid?: number; error?: string }>;
  getConfigFiles: () => Promise<{ name: string; path: string; size: number }[]>;
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
      usemmap?: boolean;
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
  onDownloadProgress: (callback: (progress: number) => void) => void;
  onInstallDirChanged: (callback: (newPath: string) => void) => () => void;
  onVersionsUpdated: (callback: () => void) => () => void;
  onKoboldOutput: (callback: (data: string) => void) => () => void;
  removeAllListeners: (channel: string) => void;
}

export interface AppAPI {
  openExternal: (url: string) => Promise<void>;
}

export interface ConfigAPI {
  get: (key: string) => Promise<unknown>;
  set: (key: string, value: unknown) => Promise<void>;
}

export interface LogsAPI {
  logError: (message: string, error?: Error) => Promise<void>;
}

export interface SillyTavernAPI {
  isNpxAvailable: () => Promise<boolean>;
}

declare global {
  interface Window {
    electronAPI: {
      kobold: KoboldAPI;
      app: AppAPI;
      config: ConfigAPI;
      logs: LogsAPI;
      sillytavern: SillyTavernAPI;
    };
  }
}
