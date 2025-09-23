import type {
  CPUCapabilities,
  GPUCapabilities,
  BasicGPUInfo,
  GPUMemoryInfo,
} from '@/types/hardware';
import type { BackendOption, BackendSupport } from '@/types';
import type { MantineColorScheme } from '@mantine/core';
import type {
  CpuMetrics,
  MemoryMetrics,
  GpuMetrics,
} from '@/main/modules/monitoring';

export interface GitHubAsset {
  name: string;
  browser_download_url: string;
  size: number;
  version?: string;
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
  filename: string;
  size?: number;
}

export interface DownloadItem {
  name: string;
  url: string;
  size: number;
  version?: string;
}

export interface KoboldConfig {
  gpulayers?: number;
  contextsize?: number;
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
  lowvram?: boolean;
  quantmatmul?: boolean;
  usemmap?: boolean;
  usecuda?: boolean;
  usevulkan?: boolean;
  useclblast?: boolean | [number, number];
  gpuDeviceSelection?: string;
  tensorSplit?: string;
  gpuPlatform?: number;
  sdmodel?: string;
  sdt5xxl?: string;
  sdclipl?: string;
  sdclipg?: string;
  sdphotomaker?: string;
  sdvae?: string;
  sdlora?: string;
  sdconvdirect?: string;
  additionalArguments?: string;
  moecpu?: number;
  moeexperts?: number;
  autoGpuLayers?: boolean;
  model?: string;
  backend?: string;
}

export interface KoboldAPI {
  getInstalledVersions: () => Promise<InstalledVersion[]>;
  getCurrentVersion: () => Promise<InstalledVersion | null>;
  setCurrentVersion: (version: string) => Promise<boolean>;
  getPlatform: () => Promise<string>;
  detectGPU: () => Promise<BasicGPUInfo>;
  detectCPU: () => Promise<CPUCapabilities>;
  detectGPUCapabilities: () => Promise<GPUCapabilities>;
  detectGPUMemory: () => Promise<GPUMemoryInfo[]>;
  detectROCm: () => Promise<{ supported: boolean; devices: string[] }>;
  detectBackendSupport: () => Promise<BackendSupport | null>;
  getAvailableBackends: (includeDisabled?: boolean) => Promise<BackendOption[]>;
  getCurrentInstallDir: () => Promise<string>;
  selectInstallDirectory: () => Promise<string | null>;
  downloadRelease: (
    asset: GitHubAsset
  ) => Promise<{ success: boolean; path?: string; error?: string }>;
  launchKoboldCpp: (
    args?: string[]
  ) => Promise<{ success: boolean; pid?: number; error?: string }>;
  getConfigFiles: () => Promise<{ name: string; path: string; size: number }[]>;
  saveConfigFile: (
    configName: string,
    configData: KoboldConfig
  ) => Promise<boolean>;
  deleteConfigFile: (configName: string) => Promise<boolean>;
  getSelectedConfig: () => Promise<string | null>;
  setSelectedConfig: (configName: string) => Promise<boolean>;
  parseConfigFile: (filePath: string) => Promise<KoboldConfig | null>;
  selectModelFile: (title?: string) => Promise<string | null>;
  stopKoboldCpp: () => void;
  onDownloadProgress: (callback: (progress: number) => void) => () => void;
  onInstallDirChanged: (callback: (newPath: string) => void) => () => void;
  onVersionsUpdated: (callback: () => void) => () => void;
  onKoboldOutput: (callback: (data: string) => void) => () => void;
}

export interface VersionInfo {
  appVersion: string;
  electronVersion: string;
  nodeVersion: string;
  chromeVersion: string;
  v8Version: string;
  osVersion: string;
  platform: string;
  arch: string;
  nodeJsSystemVersion?: string;
  uvVersion?: string;
  isAUR?: boolean;
}

export interface AppAPI {
  showLogsFolder: () => Promise<void>;
  viewConfigFile: () => Promise<void>;
  openPath: (path: string) => Promise<void>;
  getVersion: () => Promise<string>;
  getVersionInfo: () => Promise<VersionInfo>;
  minimizeWindow: () => void;
  maximizeWindow: () => void;
  closeWindow: () => void;
  isMaximized: () => Promise<boolean>;
  getZoomLevel: () => Promise<number>;
  setZoomLevel: (level: number) => Promise<void>;
  getColorScheme: () => Promise<MantineColorScheme>;
  setColorScheme: (colorScheme: MantineColorScheme) => Promise<void>;
  openExternal: (url: string) => Promise<void>;
  openPerformanceManager: () => Promise<{
    success: boolean;
    error?: string;
  }>;
  checkForUpdates: () => Promise<boolean>;
  downloadUpdate: () => Promise<boolean>;
  quitAndInstall: () => Promise<void>;
  isUpdateDownloaded: () => Promise<boolean>;
  onWindowStateToggle: (callback: () => void) => () => void;
  onLineNumbersChanged: (
    callback: (showLineNumbers: boolean) => void
  ) => () => void;
}

export interface ConfigAPI {
  get: (key: string) => Promise<unknown>;
  set: (key: string, value: unknown) => void;
}

export interface LogsAPI {
  logError: (message: string, error?: Error) => void;
}

export interface DependenciesAPI {
  isNpxAvailable: () => Promise<boolean>;
  isUvAvailable: () => Promise<boolean>;
}

export interface MonitoringAPI {
  start: () => () => void;
  onCpuMetrics: (callback: (metrics: CpuMetrics) => void) => () => void;
  onMemoryMetrics: (callback: (metrics: MemoryMetrics) => void) => () => void;
  onGpuMetrics: (callback: (metrics: GpuMetrics) => void) => () => void;
}

export interface UpdaterAPI {
  checkForUpdates: () => Promise<boolean>;
  downloadUpdate: () => Promise<boolean>;
  quitAndInstall: () => void;
  isUpdateDownloaded: () => Promise<boolean>;
  canAutoUpdate: () => Promise<boolean>;
  isAURInstallation: () => Promise<boolean>;
}

export interface NotepadTab {
  id: string;
  title: string;
  content: string;
}

export interface SavedNotepadTab {
  id: string;
  title: string;
}

export interface NotepadState {
  tabs: NotepadTab[];
  activeTabId: string | null;
  position: {
    width: number;
    height: number;
  };
  isVisible: boolean;
  showLineNumbers: boolean;
}

export interface SavedNotepadState {
  tabs: SavedNotepadTab[];
  activeTabId: string | null;
  position: {
    width: number;
    height: number;
  };
  isVisible: boolean;
  showLineNumbers?: boolean;
}

export interface NotepadAPI {
  saveTabContent: (tabId: string, content: string) => Promise<boolean>;
  loadTabContent: (tabId: string) => Promise<string>;
  saveState: (state: SavedNotepadState) => Promise<boolean>;
  loadState: () => Promise<SavedNotepadState>;
  deleteTab: (tabId: string) => Promise<boolean>;
  createNewTab: (title?: string) => Promise<NotepadTab>;
}

declare global {
  interface Window {
    electronAPI: {
      kobold: KoboldAPI;
      app: AppAPI;
      config: ConfigAPI;
      logs: LogsAPI;
      dependencies: DependenciesAPI;
      monitoring: MonitoringAPI;
      updater: UpdaterAPI;
      notepad: NotepadAPI;
    };
  }
}
