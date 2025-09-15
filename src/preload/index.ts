import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';
import type {
  KoboldAPI,
  AppAPI,
  ConfigAPI,
  LogsAPI,
  DependenciesAPI,
  MonitoringAPI,
} from '@/types/electron';

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
  detectROCm: () => ipcRenderer.invoke('kobold:detectROCm'),
  detectBackendSupport: () => ipcRenderer.invoke('kobold:detectBackendSupport'),
  getAvailableBackends: (includeDisabled) =>
    ipcRenderer.invoke('kobold:getAvailableBackends', includeDisabled),
  getCurrentInstallDir: () => ipcRenderer.invoke('kobold:getCurrentInstallDir'),
  selectInstallDirectory: () =>
    ipcRenderer.invoke('kobold:selectInstallDirectory'),
  downloadRelease: (asset) =>
    ipcRenderer.invoke('kobold:downloadRelease', asset),
  launchKoboldCpp: (args) => ipcRenderer.invoke('kobold:launchKoboldCpp', args),
  getConfigFiles: () => ipcRenderer.invoke('kobold:getConfigFiles'),
  saveConfigFile: (configName, configData) =>
    ipcRenderer.invoke('kobold:saveConfigFile', configName, configData),
  getSelectedConfig: () => ipcRenderer.invoke('kobold:getSelectedConfig'),
  setSelectedConfig: (configName) =>
    ipcRenderer.invoke('kobold:setSelectedConfig', configName),
  parseConfigFile: (filePath) =>
    ipcRenderer.invoke('kobold:parseConfigFile', filePath),
  selectModelFile: (title) =>
    ipcRenderer.invoke('kobold:selectModelFile', title),
  stopKoboldCpp: () => ipcRenderer.invoke('kobold:stopKoboldCpp'),
  onDownloadProgress: (callback) => {
    ipcRenderer.on(
      'download-progress',
      (_: IpcRendererEvent, progress: number) => callback(progress)
    );
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
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  },
};

const appAPI: AppAPI = {
  showLogsFolder: () => ipcRenderer.invoke('app:showLogsFolder'),
  getVersion: () => ipcRenderer.invoke('app:getVersion'),
  getVersionInfo: () => ipcRenderer.invoke('app:getVersionInfo'),
  minimizeWindow: () => ipcRenderer.invoke('app:minimizeWindow'),
  maximizeWindow: () => ipcRenderer.invoke('app:maximizeWindow'),
  closeWindow: () => ipcRenderer.invoke('app:closeWindow'),
  getZoomLevel: () => ipcRenderer.invoke('app:getZoomLevel'),
  setZoomLevel: (level) => ipcRenderer.invoke('app:setZoomLevel', level),
  getColorScheme: () => ipcRenderer.invoke('app:getColorScheme'),
  setColorScheme: (colorScheme) =>
    ipcRenderer.invoke('app:setColorScheme', colorScheme),
  openExternal: (url) => ipcRenderer.invoke('app:openExternal', url),
};

const configAPI: ConfigAPI = {
  get: (key) => ipcRenderer.invoke('config:get', key),
  set: (key, value) => ipcRenderer.invoke('config:set', key, value),
};

const logsAPI: LogsAPI = {
  logError: (message, error) =>
    ipcRenderer.invoke('logs:logError', message, error),
};

const dependenciesAPI: DependenciesAPI = {
  isUvAvailable: () => ipcRenderer.invoke('dependencies:isUvAvailable'),
  isNpxAvailable: () => ipcRenderer.invoke('dependencies:isNpxAvailable'),
};

const monitoringAPI: MonitoringAPI = {
  start: () => ipcRenderer.invoke('monitoring:start'),
  stop: () => ipcRenderer.invoke('monitoring:stop'),
  onCpuMetrics: (callback) => {
    ipcRenderer.on('cpu-metrics', (_, metrics) => callback(metrics));
  },
  onMemoryMetrics: (callback) => {
    ipcRenderer.on('memory-metrics', (_, metrics) => callback(metrics));
  },
  onGpuMetrics: (callback) => {
    ipcRenderer.on('gpu-metrics', (_, metrics) => callback(metrics));
  },
  removeCpuMetricsListener: () => {
    ipcRenderer.removeAllListeners('cpu-metrics');
  },
  removeMemoryMetricsListener: () => {
    ipcRenderer.removeAllListeners('memory-metrics');
  },
  removeGpuMetricsListener: () => {
    ipcRenderer.removeAllListeners('gpu-metrics');
  },
};

contextBridge.exposeInMainWorld('electronAPI', {
  kobold: koboldAPI,
  app: appAPI,
  config: configAPI,
  logs: logsAPI,
  dependencies: dependenciesAPI,
  monitoring: monitoringAPI,
});
