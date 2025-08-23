import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';
import type { KoboldAPI, AppAPI, ConfigAPI, LogsAPI } from '@/types/electron';

const koboldAPI: KoboldAPI = {
  getInstalledVersions: () => ipcRenderer.invoke('kobold:getInstalledVersions'),
  getCurrentBinaryInfo: () => ipcRenderer.invoke('kobold:getCurrentBinaryInfo'),
  setCurrentVersion: (version: string) =>
    ipcRenderer.invoke('kobold:setCurrentVersion', version),
  getLatestReleaseWithStatus: () =>
    ipcRenderer.invoke('kobold:getLatestReleaseWithStatus'),
  getROCmDownload: () => ipcRenderer.invoke('kobold:getROCmDownload'),
  downloadROCm: () => ipcRenderer.invoke('kobold:downloadROCm'),
  getLatestRelease: () => ipcRenderer.invoke('kobold:getLatestRelease'),
  getPlatform: () => ipcRenderer.invoke('kobold:getPlatform'),
  detectGPU: () => ipcRenderer.invoke('kobold:detectGPU'),
  detectCPU: () => ipcRenderer.invoke('kobold:detectCPU'),
  detectGPUCapabilities: () =>
    ipcRenderer.invoke('kobold:detectGPUCapabilities'),
  detectGPUMemory: () => ipcRenderer.invoke('kobold:detectGPUMemory'),
  detectROCm: () => ipcRenderer.invoke('kobold:detectROCm'),
  detectBackendSupport: () => ipcRenderer.invoke('kobold:detectBackendSupport'),
  getAvailableBackends: () => ipcRenderer.invoke('kobold:getAvailableBackends'),
  getCurrentInstallDir: () => ipcRenderer.invoke('kobold:getCurrentInstallDir'),
  selectInstallDirectory: () =>
    ipcRenderer.invoke('kobold:selectInstallDirectory'),
  downloadRelease: (asset) =>
    ipcRenderer.invoke('kobold:downloadRelease', asset),
  launchKoboldCpp: (args?: string[]) =>
    ipcRenderer.invoke('kobold:launchKoboldCpp', args),
  getConfigFiles: () => ipcRenderer.invoke('kobold:getConfigFiles'),
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
  ) => ipcRenderer.invoke('kobold:saveConfigFile', configName, configData),
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

contextBridge.exposeInMainWorld('electronAPI', {
  kobold: koboldAPI,
  app: appAPI,
  config: configAPI,
  logs: logsAPI,
});
