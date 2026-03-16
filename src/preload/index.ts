import { contextBridge, ipcRenderer } from 'electron';
import type { IpcRendererEvent } from 'electron';

import type { CpuMetrics, GpuMetrics, MemoryMetrics } from '@/main/modules/monitoring';
import type {
  AppAPI,
  ConfigAPI,
  DependenciesAPI,
  KoboldAPI,
  LogsAPI,
  MonitoringAPI,
  NotepadAPI,
  UpdaterAPI,
} from '@/types/electron';
import type { KoboldCrashInfo } from '@/types/ipc';

const koboldAPI: KoboldAPI = {
  analyzeModel: (filePath) => ipcRenderer.invoke('kobold:analyzeModel', filePath),
  calculateOptimalLayers: (modelPath, contextSize, availableVramGB, flashAttention, acceleration) =>
    ipcRenderer.invoke(
      'kobold:calculateOptimalLayers',
      modelPath,
      contextSize,
      availableVramGB,
      flashAttention,
      acceleration,
    ),
  deleteConfigFile: (configName) => ipcRenderer.invoke('kobold:deleteConfigFile', configName),
  deleteRelease: (binaryPath) => ipcRenderer.invoke('kobold:deleteRelease', binaryPath),
  detectAccelerationSupport: () => ipcRenderer.invoke('kobold:detectAccelerationSupport'),
  detectCPU: () => ipcRenderer.invoke('kobold:detectCPU'),
  detectGPU: () => ipcRenderer.invoke('kobold:detectGPU'),
  detectGPUCapabilities: () => ipcRenderer.invoke('kobold:detectGPUCapabilities'),
  detectGPUMemory: () => ipcRenderer.invoke('kobold:detectGPUMemory'),
  detectROCm: () => ipcRenderer.invoke('kobold:detectROCm'),
  detectSystemMemory: () => ipcRenderer.invoke('kobold:detectSystemMemory'),
  downloadRelease: (asset, options) => ipcRenderer.invoke('kobold:downloadRelease', asset, options),
  getAvailableAccelerations: (includeDisabled) =>
    ipcRenderer.invoke('kobold:getAvailableAccelerations', includeDisabled),
  getConfigFiles: () => ipcRenderer.invoke('kobold:getConfigFiles'),
  getCurrentBackend: () => ipcRenderer.invoke('kobold:getCurrentBackend'),
  getCurrentInstallDir: () => ipcRenderer.invoke('kobold:getCurrentInstallDir'),
  getInstalledBackends: () => ipcRenderer.invoke('kobold:getInstalledBackends'),
  getLocalModels: (paramType) => ipcRenderer.invoke('kobold:getLocalModels', paramType),
  getPlatform: () => ipcRenderer.invoke('kobold:getPlatform'),
  getSelectedConfig: () => ipcRenderer.invoke('kobold:getSelectedConfig'),
  importLocalBackend: () => ipcRenderer.invoke('kobold:importLocalBackend'),
  launchKoboldCpp: (args, preLaunchCommands) =>
    ipcRenderer.invoke('kobold:launchKoboldCpp', args, preLaunchCommands),
  onDownloadProgress: (callback) => {
    const handler = (_: IpcRendererEvent, progress: number) => callback(progress);
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
  onKoboldCrashed: (callback) => {
    const handler = (_: IpcRendererEvent, crashInfo: KoboldCrashInfo) => callback(crashInfo);
    ipcRenderer.on('kobold-crashed', handler);

    return () => {
      ipcRenderer.removeListener('kobold-crashed', handler);
    };
  },
  onKoboldOutput: (callback) => {
    const handler = (_: IpcRendererEvent, data: string) => callback(data);
    ipcRenderer.on('kobold-output', handler);

    return () => {
      ipcRenderer.removeListener('kobold-output', handler);
    };
  },
  onServerReady: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('server-ready', handler);

    return () => {
      ipcRenderer.removeListener('server-ready', handler);
    };
  },
  onTunnelUrlChanged: (callback) => {
    const handler = (_: IpcRendererEvent, url: string | null) => callback(url);
    ipcRenderer.on('tunnel-url-changed', handler);

    return () => {
      ipcRenderer.removeListener('tunnel-url-changed', handler);
    };
  },
  onVersionsUpdated: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('versions-updated', handler);

    return () => {
      ipcRenderer.removeListener('versions-updated', handler);
    };
  },
  parseConfigFile: (filePath) => ipcRenderer.invoke('kobold:parseConfigFile', filePath),
  saveConfigFile: (configName, configData) =>
    ipcRenderer.invoke('kobold:saveConfigFile', configName, configData),
  selectInstallDirectory: () => ipcRenderer.invoke('kobold:selectInstallDirectory'),
  selectModelFile: (title) => ipcRenderer.invoke('kobold:selectModelFile', title),
  setCurrentBackend: (backend) => ipcRenderer.invoke('kobold:setCurrentBackend', backend),
  setSelectedConfig: (configName) => ipcRenderer.invoke('kobold:setSelectedConfig', configName),
  stopKoboldCpp: () => void ipcRenderer.invoke('kobold:stopKoboldCpp'),
};

const appAPI: AppAPI = {
  checkForUpdates: () => ipcRenderer.invoke('app:checkForUpdates'),
  closeWindow: async () => ipcRenderer.invoke('app:closeWindow'),
  downloadUpdate: () => ipcRenderer.invoke('app:downloadUpdate'),
  getColorScheme: () => ipcRenderer.invoke('app:getColorScheme'),
  getEnableSystemTray: () => ipcRenderer.invoke('app:getEnableSystemTray'),
  getStartMinimizedToTray: () => ipcRenderer.invoke('app:getStartMinimizedToTray'),
  getVersion: () => ipcRenderer.invoke('app:getVersion'),
  getVersionInfo: () => ipcRenderer.invoke('app:getVersionInfo'),
  getZoomLevel: () => ipcRenderer.invoke('app:getZoomLevel'),
  isMaximized: () => ipcRenderer.invoke('app:isMaximized'),
  isUpdateDownloaded: () => ipcRenderer.invoke('app:isUpdateDownloaded'),
  maximizeWindow: async () => ipcRenderer.invoke('app:maximizeWindow'),
  minimizeWindow: async () => ipcRenderer.invoke('app:minimizeWindow'),
  onLineNumbersChanged: (callback) => {
    const handler = (_: IpcRendererEvent, showLineNumbers: boolean) => callback(showLineNumbers);

    ipcRenderer.on('line-numbers-changed', handler);

    return () => {
      ipcRenderer.removeListener('line-numbers-changed', handler);
    };
  },
  onTrayEject: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('tray:eject', handler);
    return () => {
      ipcRenderer.removeListener('tray:eject', handler);
    };
  },
  onWindowStateToggle: (callback) => {
    const handler = () => callback();

    ipcRenderer.on('window-maximized', handler);
    ipcRenderer.on('window-unmaximized', handler);

    return () => {
      ipcRenderer.removeListener('window-maximized', handler);
      ipcRenderer.removeListener('window-unmaximized', handler);
    };
  },
  openExternal: (url) => ipcRenderer.invoke('app:openExternal', url),
  openPath: (path) => ipcRenderer.invoke('app:openPath', path),
  openPerformanceManager: () => ipcRenderer.invoke('app:openPerformanceManager'),
  quitAndInstall: () => ipcRenderer.invoke('app:quitAndInstall'),
  setColorScheme: async (colorScheme) => ipcRenderer.invoke('app:setColorScheme', colorScheme),
  setEnableSystemTray: (enabled) => ipcRenderer.invoke('app:setEnableSystemTray', enabled),
  setStartMinimizedToTray: (enabled) => ipcRenderer.invoke('app:setStartMinimizedToTray', enabled),
  setZoomLevel: async (level) => ipcRenderer.invoke('app:setZoomLevel', level),
  showLogsFolder: () => ipcRenderer.invoke('app:showLogsFolder'),
  updateTrayState: (state) => ipcRenderer.invoke('app:updateTrayState', state),
  viewConfigFile: () => ipcRenderer.invoke('app:viewConfigFile'),
};

const configAPI: ConfigAPI = {
  get: (key) => ipcRenderer.invoke('config:get', key),
  set: (key, value) => ipcRenderer.send('config:set', key, value),
};

const logsAPI: LogsAPI = {
  logError: (message, error) => ipcRenderer.send('logs:logError', message, error),
};

const dependenciesAPI: DependenciesAPI = {
  clearOpenWebUIData: () => ipcRenderer.invoke('dependencies:clearOpenWebUIData'),
  isNpxAvailable: () => ipcRenderer.invoke('dependencies:isNpxAvailable'),
  isUvAvailable: () => ipcRenderer.invoke('dependencies:isUvAvailable'),
};

const monitoringAPI: MonitoringAPI = {
  onCpuMetrics: (callback) => {
    const handler = (_: IpcRendererEvent, metrics: CpuMetrics) => callback(metrics);
    ipcRenderer.on('cpu-metrics', handler);

    return () => {
      ipcRenderer.removeListener('cpu-metrics', handler);
    };
  },
  onGpuMetrics: (callback) => {
    const handler = (_: IpcRendererEvent, metrics: GpuMetrics) => callback(metrics);
    ipcRenderer.on('gpu-metrics', handler);

    return () => {
      ipcRenderer.removeListener('gpu-metrics', handler);
    };
  },
  onMemoryMetrics: (callback) => {
    const handler = (_: IpcRendererEvent, metrics: MemoryMetrics) => callback(metrics);
    ipcRenderer.on('memory-metrics', handler);

    return () => {
      ipcRenderer.removeListener('memory-metrics', handler);
    };
  },
  start: () => {
    ipcRenderer.send('monitoring:start');

    return () => {
      ipcRenderer.send('monitoring:stop');
    };
  },
};

const updaterAPI: UpdaterAPI = {
  canAutoUpdate: () => ipcRenderer.invoke('app:canAutoUpdate'),
  checkForUpdates: () => ipcRenderer.invoke('app:checkForUpdates'),
  downloadUpdate: () => ipcRenderer.invoke('app:downloadUpdate'),
  isAURInstallation: () => ipcRenderer.invoke('app:isAURInstallation'),
  isUpdateDownloaded: () => ipcRenderer.invoke('app:isUpdateDownloaded'),
  quitAndInstall: async () => ipcRenderer.invoke('app:quitAndInstall'),
};

const notepadAPI: NotepadAPI = {
  createNewTab: (title) => ipcRenderer.invoke('notepad:createNewTab', title),
  deleteTab: (title) => ipcRenderer.invoke('notepad:deleteTab', title),
  loadState: () => ipcRenderer.invoke('notepad:loadState'),
  loadTabContent: (title) => ipcRenderer.invoke('notepad:loadTabContent', title),
  renameTab: (oldTitle, newTitle) => ipcRenderer.invoke('notepad:renameTab', oldTitle, newTitle),
  saveState: (state) => ipcRenderer.invoke('notepad:saveState', state),
  saveTabContent: (title, content) => ipcRenderer.invoke('notepad:saveTabContent', title, content),
};

contextBridge.exposeInMainWorld('electronAPI', {
  app: appAPI,
  config: configAPI,
  dependencies: dependenciesAPI,
  kobold: koboldAPI,
  logs: logsAPI,
  monitoring: monitoringAPI,
  notepad: notepadAPI,
  updater: updaterAPI,
});
