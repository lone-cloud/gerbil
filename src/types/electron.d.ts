import type {
  CPUCapabilities,
  GPUCapabilities,
  BasicGPUInfo,
  GPUMemoryInfo,
  SystemMemoryInfo,
} from '@/types/hardware';
import type {
  AccelerationOption,
  AccelerationSupport,
  Screen,
  ModelAnalysis,
  CachedModel,
} from '@/types';
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
}

export interface DownloadReleaseOptions {
  isUpdate?: boolean;
  wasCurrentBinary?: boolean;
  oldBackendPath?: string;
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
    installedBackendVersion?: string;
  }[];
}

export interface InstalledBackend {
  version: string;
  path: string;
  filename: string;
  size?: number;
  actualVersion?: string;
}

export interface DownloadItem {
  name: string;
  url: string;
  size: number;
  version?: string;
}

export interface OptimalLayersResult {
  recommendedLayers: number;
  totalLayers: number;
  estimatedVramUsageGB: number;
  modelVramGB: number;
  contextVramGB: number;
  headroomGB: number;
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
  debugmode?: boolean;
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
  sdvaecpu?: boolean;
  sdclipgpu?: boolean;
  additionalArguments?: string;
  preLaunchCommands?: string[];
  moecpu?: number;
  moeexperts?: number;
  autoGpuLayers?: boolean;
  model?: string;
  backend?: string;
}

export interface KoboldAPI {
  getInstalledBackends: () => Promise<InstalledBackend[]>;
  getCurrentBackend: () => Promise<InstalledBackend | null>;
  setCurrentBackend: (version: string) => Promise<boolean>;
  getPlatform: () => Promise<string>;
  detectGPU: () => Promise<BasicGPUInfo>;
  detectCPU: () => Promise<CPUCapabilities>;
  detectGPUCapabilities: () => Promise<GPUCapabilities>;
  detectGPUMemory: () => Promise<GPUMemoryInfo[]>;
  detectSystemMemory: () => Promise<SystemMemoryInfo>;
  detectROCm: () => Promise<{ supported: boolean; devices: string[] }>;
  detectAccelerationSupport: () => Promise<AccelerationSupport | null>;
  getAvailableAccelerations: (
    includeDisabled?: boolean
  ) => Promise<AccelerationOption[]>;
  getCurrentInstallDir: () => Promise<string>;
  selectInstallDirectory: () => Promise<string | null>;
  downloadRelease: (
    asset: GitHubAsset,
    options: DownloadReleaseOptions
  ) => Promise<void>;
  deleteRelease: (
    binaryPath: string
  ) => Promise<{ success: boolean; error?: string }>;
  launchKoboldCpp: (
    args?: string[],
    preLaunchCommands?: string[]
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
  importLocalBackend: () => Promise<{ success: boolean; error?: string }>;
  getLocalModels: (paramType: string) => Promise<CachedModel[]>;
  analyzeModel: (filePath: string) => Promise<ModelAnalysis>;
  calculateOptimalLayers: (
    modelPath: string,
    contextSize: number,
    availableVramGB: number,
    flashAttention: boolean
  ) => Promise<OptimalLayersResult>;
  stopKoboldCpp: () => void;
  onDownloadProgress: (callback: (progress: number) => void) => () => void;
  onInstallDirChanged: (callback: (newPath: string) => void) => () => void;
  onVersionsUpdated: (callback: () => void) => () => void;
  onKoboldOutput: (callback: (data: string) => void) => () => void;
}

export interface SystemVersionInfo {
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
  aurPackageVersion?: string;
}

export interface AppAPI {
  showLogsFolder: () => Promise<void>;
  viewConfigFile: () => Promise<void>;
  openPath: (path: string) => Promise<void>;
  getVersion: () => Promise<string>;
  getVersionInfo: () => Promise<SystemVersionInfo>;
  minimizeWindow: () => void;
  maximizeWindow: () => void;
  closeWindow: () => void;
  isMaximized: () => Promise<boolean>;
  getZoomLevel: () => Promise<number>;
  setZoomLevel: (level: number) => Promise<void>;
  getColorScheme: () => Promise<MantineColorScheme>;
  setColorScheme: (colorScheme: MantineColorScheme) => Promise<void>;
  getEnableSystemTray: () => Promise<boolean>;
  setEnableSystemTray: (enabled: boolean) => Promise<void>;
  updateTrayState: (state: {
    screen?: Screen | null;
    model?: string | null;
    config?: string | null;
    monitoringEnabled?: boolean;
  }) => Promise<void>;
  onTrayEject: (callback: () => void) => () => void;
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
  title: string;
  content: string;
}

export interface SavedNotepadTab {
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
  activeTabId: string | null;
  position: {
    width: number;
    height: number;
  };
  isVisible: boolean;
  showLineNumbers?: boolean;
}

export interface NotepadStateWithTabs extends SavedNotepadState {
  tabs: SavedNotepadTab[];
}

export interface NotepadAPI {
  saveTabContent: (title: string, content: string) => Promise<boolean>;
  loadTabContent: (title: string) => Promise<string>;
  renameTab: (oldTitle: string, newTitle: string) => Promise<boolean>;
  saveState: (state: SavedNotepadState) => Promise<boolean>;
  loadState: () => Promise<NotepadStateWithTabs>;
  deleteTab: (title: string) => Promise<boolean>;
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
