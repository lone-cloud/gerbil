import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';
import type {
  KoboldAPI,
  AppAPI,
  ConfigAPI,
  LogsAPI,
  SillyTavernAPI,
  KoboldConfig,
} from '@/types/electron';

const koboldAPI: KoboldAPI = {
  getInstalledVersions: () => ipcRenderer.invoke('kobold:getInstalledVersions'),
  setCurrentVersion: (version: string) =>
    ipcRenderer.invoke('kobold:setCurrentVersion', version),
  downloadROCm: () => ipcRenderer.invoke('kobold:downloadROCm'),
  getPlatform: () => ipcRenderer.invoke('kobold:getPlatform'),
  detectGPU: () => ipcRenderer.invoke('kobold:detectGPU'),
  detectCPU: () => ipcRenderer.invoke('kobold:detectCPU'),
  detectGPUCapabilities: () =>
    ipcRenderer.invoke('kobold:detectGPUCapabilities'),
  detectGPUMemory: () => ipcRenderer.invoke('kobold:detectGPUMemory'),
  detectROCm: () => ipcRenderer.invoke('kobold:detectROCm'),
  detectBackendSupport: () => ipcRenderer.invoke('kobold:detectBackendSupport'),
  getAvailableBackends: (includeDisabled?: boolean) =>
    ipcRenderer.invoke('kobold:getAvailableBackends', includeDisabled),
  getCurrentInstallDir: () => ipcRenderer.invoke('kobold:getCurrentInstallDir'),
  selectInstallDirectory: () =>
    ipcRenderer.invoke('kobold:selectInstallDirectory'),
  downloadRelease: (asset) =>
    ipcRenderer.invoke('kobold:downloadRelease', asset),
  launchKoboldCpp: (args?: string[]) =>
    ipcRenderer.invoke('kobold:launchKoboldCpp', args),
  getConfigFiles: () => ipcRenderer.invoke('kobold:getConfigFiles'),
  saveConfigFile: (configName: string, configData: KoboldConfig) =>
    ipcRenderer.invoke('kobold:saveConfigFile', configName, configData),
  getSelectedConfig: () => ipcRenderer.invoke('kobold:getSelectedConfig'),
  setSelectedConfig: (configName: string) =>
    ipcRenderer.invoke('kobold:setSelectedConfig', configName),
  parseConfigFile: (filePath: string) =>
    ipcRenderer.invoke('kobold:parseConfigFile', filePath),
  selectModelFile: () => ipcRenderer.invoke('kobold:selectModelFile'),
  stopKoboldCpp: () => ipcRenderer.invoke('kobold:stopKoboldCpp'),
  onDownloadProgress: (callback) => {
    ipcRenderer.on(
      'download-progress',
      (_: IpcRendererEvent, progress: number) => callback(progress)
    );
  },
  onInstallDirChanged: (callback: (newPath: string) => void) => {
    const handler = (_: IpcRendererEvent, newPath: string) => callback(newPath);
    ipcRenderer.on('install-dir-changed', handler);

    return () => {
      ipcRenderer.removeListener('install-dir-changed', handler);
    };
  },
  onVersionsUpdated: (callback: () => void) => {
    const handler = () => callback();
    ipcRenderer.on('versions-updated', handler);

    return () => {
      ipcRenderer.removeListener('versions-updated', handler);
    };
  },
  onKoboldOutput: (callback: (data: string) => void) => {
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
  openExternal: (url) => ipcRenderer.invoke('app:openExternal', url),
  getVersion: () => ipcRenderer.invoke('app:getVersion'),
};

const configAPI: ConfigAPI = {
  get: (key: string) => ipcRenderer.invoke('config:get', key),
  set: (key: string, value: unknown) =>
    ipcRenderer.invoke('config:set', key, value),
};

const logsAPI: LogsAPI = {
  logError: (message: string, error?: Error) =>
    ipcRenderer.invoke('logs:logError', message, error),
};

const sillyTavernAPI: SillyTavernAPI = {
  isNpxAvailable: () => ipcRenderer.invoke('sillytavern:isNpxAvailable'),
};

contextBridge.exposeInMainWorld('electronAPI', {
  kobold: koboldAPI,
  app: appAPI,
  config: configAPI,
  logs: logsAPI,
  sillytavern: sillyTavernAPI,
});
