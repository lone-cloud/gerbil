import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';
import type {
  KoboldAPI,
  AppAPI,
  ConfigAPI,
  LogsAPI,
  DependenciesAPI,
  MonitoringAPI,
  UpdaterAPI,
  NotepadAPI,
} from '@/types/electron';
import type {
  CpuMetrics,
  MemoryMetrics,
  GpuMetrics,
} from '@/main/modules/monitoring';

const koboldAPI: KoboldAPI = {
  getInstalledVersions: () => ipcRenderer.invoke('kobold:getInstalledVersions'),
  getCurrentVersion: () => ipcRenderer.invoke('kobold:getCurrentVersion'),
  setCurrentVersion: (version) =>
    ipcRenderer.invoke('kobold:setCurrentVersion', version),
  getPlatform: () => ipcRenderer.invoke('kobold:getPlatform'),
  detectGPU: () => ipcRenderer.invoke('kobold:detectGPU'),
  detectCPU: () => ipcRenderer.invoke('kobold:detectCPU'),
  detectGPUCapabilities: () =>
    ipcRenderer.invoke('kobold:detectGPUCapabilities'),
  detectGPUMemory: () => ipcRenderer.invoke('kobold:detectGPUMemory'),
  detectSystemMemory: () => ipcRenderer.invoke('kobold:detectSystemMemory'),
  detectROCm: () => ipcRenderer.invoke('kobold:detectROCm'),
  detectBackendSupport: () => ipcRenderer.invoke('kobold:detectBackendSupport'),
  getAvailableBackends: (includeDisabled) =>
    ipcRenderer.invoke('kobold:getAvailableBackends', includeDisabled),
  getCurrentInstallDir: () => ipcRenderer.invoke('kobold:getCurrentInstallDir'),
  selectInstallDirectory: () =>
    ipcRenderer.invoke('kobold:selectInstallDirectory'),
  downloadRelease: (asset, options) =>
    ipcRenderer.invoke('kobold:downloadRelease', asset, options),
  deleteRelease: (binaryPath) =>
    ipcRenderer.invoke('kobold:deleteRelease', binaryPath),
  launchKoboldCpp: (args) => ipcRenderer.invoke('kobold:launchKoboldCpp', args),
  getConfigFiles: () => ipcRenderer.invoke('kobold:getConfigFiles'),
  saveConfigFile: (configName, configData) =>
    ipcRenderer.invoke('kobold:saveConfigFile', configName, configData),
  deleteConfigFile: (configName) =>
    ipcRenderer.invoke('kobold:deleteConfigFile', configName),
  getSelectedConfig: () => ipcRenderer.invoke('kobold:getSelectedConfig'),
  setSelectedConfig: (configName) =>
    ipcRenderer.invoke('kobold:setSelectedConfig', configName),
  parseConfigFile: (filePath) =>
    ipcRenderer.invoke('kobold:parseConfigFile', filePath),
  selectModelFile: (title) =>
    ipcRenderer.invoke('kobold:selectModelFile', title),
  analyzeModel: (filePath) =>
    ipcRenderer.invoke('kobold:analyzeModel', filePath),
  stopKoboldCpp: () => ipcRenderer.invoke('kobold:stopKoboldCpp'),
  onDownloadProgress: (callback) => {
    const handler = (_: IpcRendererEvent, progress: number) =>
      callback(progress);
    ipcRenderer.on('download-progress', handler);

    return () => {
      ipcRenderer.removeListener('download-progress', handler);
    };
  },
  onInstallDirChanged: (callback) => {
    const handler = (_: IpcRendererEvent, newPath: string) => callback(newPath);
    ipcRenderer.on('install-dir-changed', handler);

    return () => {
      ipcRenderer.removeListener('install-dir-changed', handler);
    };
  },
  onVersionsUpdated: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('versions-updated', handler);

    return () => {
      ipcRenderer.removeListener('versions-updated', handler);
    };
  },
  onKoboldOutput: (callback) => {
    const handler = (_: IpcRendererEvent, data: string) => callback(data);
    ipcRenderer.on('kobold-output', handler);

    return () => {
      ipcRenderer.removeListener('kobold-output', handler);
    };
  },
};

const appAPI: AppAPI = {
  showLogsFolder: () => ipcRenderer.invoke('app:showLogsFolder'),
  viewConfigFile: () => ipcRenderer.invoke('app:viewConfigFile'),
  openPath: (path) => ipcRenderer.invoke('app:openPath', path),
  getVersion: () => ipcRenderer.invoke('app:getVersion'),
  getVersionInfo: () => ipcRenderer.invoke('app:getVersionInfo'),
  minimizeWindow: () => ipcRenderer.invoke('app:minimizeWindow'),
  maximizeWindow: () => ipcRenderer.invoke('app:maximizeWindow'),
  closeWindow: () => ipcRenderer.invoke('app:closeWindow'),
  isMaximized: () => ipcRenderer.invoke('app:isMaximized'),
  getZoomLevel: () => ipcRenderer.invoke('app:getZoomLevel'),
  setZoomLevel: (level) => ipcRenderer.invoke('app:setZoomLevel', level),
  getColorScheme: () => ipcRenderer.invoke('app:getColorScheme'),
  setColorScheme: (colorScheme) =>
    ipcRenderer.invoke('app:setColorScheme', colorScheme),
  getEnableSystemTray: () => ipcRenderer.invoke('app:getEnableSystemTray'),
  setEnableSystemTray: (enabled) =>
    ipcRenderer.invoke('app:setEnableSystemTray', enabled),
  updateTrayState: (state) => ipcRenderer.invoke('app:updateTrayState', state),
  onTrayEject: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('tray:eject', handler);
    return () => {
      ipcRenderer.removeListener('tray:eject', handler);
    };
  },
  openExternal: (url) => ipcRenderer.invoke('app:openExternal', url),
  openPerformanceManager: () =>
    ipcRenderer.invoke('app:openPerformanceManager'),
  checkForUpdates: () => ipcRenderer.invoke('app:checkForUpdates'),
  downloadUpdate: () => ipcRenderer.invoke('app:downloadUpdate'),
  quitAndInstall: () => ipcRenderer.invoke('app:quitAndInstall'),
  isUpdateDownloaded: () => ipcRenderer.invoke('app:isUpdateDownloaded'),
  onWindowStateToggle: (callback) => {
    const handler = () => callback();

    ipcRenderer.on('window-maximized', handler);
    ipcRenderer.on('window-unmaximized', handler);

    return () => {
      ipcRenderer.removeListener('window-maximized', handler);
      ipcRenderer.removeListener('window-unmaximized', handler);
    };
  },
  onLineNumbersChanged: (callback) => {
    const handler = (_: IpcRendererEvent, showLineNumbers: boolean) =>
      callback(showLineNumbers);

    ipcRenderer.on('line-numbers-changed', handler);

    return () => {
      ipcRenderer.removeListener('line-numbers-changed', handler);
    };
  },
};

const configAPI: ConfigAPI = {
  get: (key) => ipcRenderer.invoke('config:get', key),
  set: (key, value) => ipcRenderer.send('config:set', key, value),
};

const logsAPI: LogsAPI = {
  logError: (message, error) =>
    ipcRenderer.send('logs:logError', message, error),
};

const dependenciesAPI: DependenciesAPI = {
  isUvAvailable: () => ipcRenderer.invoke('dependencies:isUvAvailable'),
  isNpxAvailable: () => ipcRenderer.invoke('dependencies:isNpxAvailable'),
};

const monitoringAPI: MonitoringAPI = {
  start: () => {
    ipcRenderer.send('monitoring:start');

    return () => {
      ipcRenderer.send('monitoring:stop');
    };
  },
  onCpuMetrics: (callback) => {
    const handler = (_: IpcRendererEvent, metrics: CpuMetrics) =>
      callback(metrics);
    ipcRenderer.on('cpu-metrics', handler);

    return () => {
      ipcRenderer.removeListener('cpu-metrics', handler);
    };
  },
  onMemoryMetrics: (callback) => {
    const handler = (_: IpcRendererEvent, metrics: MemoryMetrics) =>
      callback(metrics);
    ipcRenderer.on('memory-metrics', handler);

    return () => {
      ipcRenderer.removeListener('memory-metrics', handler);
    };
  },
  onGpuMetrics: (callback) => {
    const handler = (_: IpcRendererEvent, metrics: GpuMetrics) =>
      callback(metrics);
    ipcRenderer.on('gpu-metrics', handler);

    return () => {
      ipcRenderer.removeListener('gpu-metrics', handler);
    };
  },
};

const updaterAPI: UpdaterAPI = {
  checkForUpdates: () => ipcRenderer.invoke('app:checkForUpdates'),
  downloadUpdate: () => ipcRenderer.invoke('app:downloadUpdate'),
  quitAndInstall: () => ipcRenderer.invoke('app:quitAndInstall'),
  isUpdateDownloaded: () => ipcRenderer.invoke('app:isUpdateDownloaded'),
  canAutoUpdate: () => ipcRenderer.invoke('app:canAutoUpdate'),
  isAURInstallation: () => ipcRenderer.invoke('app:isAURInstallation'),
};

const notepadAPI: NotepadAPI = {
  saveTabContent: (title, content) =>
    ipcRenderer.invoke('notepad:saveTabContent', title, content),
  loadTabContent: (title) =>
    ipcRenderer.invoke('notepad:loadTabContent', title),
  renameTab: (oldTitle, newTitle) =>
    ipcRenderer.invoke('notepad:renameTab', oldTitle, newTitle),
  saveState: (state) => ipcRenderer.invoke('notepad:saveState', state),
  loadState: () => ipcRenderer.invoke('notepad:loadState'),
  deleteTab: (title) => ipcRenderer.invoke('notepad:deleteTab', title),
  createNewTab: (title) => ipcRenderer.invoke('notepad:createNewTab', title),
};

contextBridge.exposeInMainWorld('electronAPI', {
  kobold: koboldAPI,
  app: appAPI,
  config: configAPI,
  logs: logsAPI,
  dependencies: dependenciesAPI,
  monitoring: monitoringAPI,
  updater: updaterAPI,
  notepad: notepadAPI,
});
