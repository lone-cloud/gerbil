import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';
import type {
  KoboldAPI,
  AppAPI,
  ConfigAPI,
  UpdateInfo,
} from '@/types/electron';

const koboldAPI: KoboldAPI = {
  getInstalledVersion: () => ipcRenderer.invoke('kobold:getInstalledVersion'),
  getInstalledVersions: (includeVersions?: boolean) =>
    ipcRenderer.invoke('kobold:getInstalledVersions', includeVersions),
  getCurrentVersion: () => ipcRenderer.invoke('kobold:getCurrentVersion'),
  setCurrentVersion: (version: string) =>
    ipcRenderer.invoke('kobold:setCurrentVersion', version),
  getVersionFromBinary: (binaryPath: string) =>
    ipcRenderer.invoke('kobold:getVersionFromBinary', binaryPath),
  getLatestReleaseWithStatus: () =>
    ipcRenderer.invoke('kobold:getLatestReleaseWithStatus'),
  getROCmDownload: () => ipcRenderer.invoke('kobold:getROCmDownload'),
  downloadROCm: () => ipcRenderer.invoke('kobold:downloadROCm'),
  getLatestRelease: () => ipcRenderer.invoke('kobold:getLatestRelease'),
  getAllReleases: () => ipcRenderer.invoke('kobold:getAllReleases'),
  getPlatform: () => ipcRenderer.invoke('kobold:getPlatform'),
  detectGPU: () => ipcRenderer.invoke('kobold:detectGPU'),
  detectCPU: () => ipcRenderer.invoke('kobold:detectCPU'),
  detectGPUCapabilities: () =>
    ipcRenderer.invoke('kobold:detectGPUCapabilities'),
  detectROCm: () => ipcRenderer.invoke('kobold:detectROCm'),
  detectHardware: () => ipcRenderer.invoke('kobold:detectHardware'),
  detectAllCapabilities: () =>
    ipcRenderer.invoke('kobold:detectAllCapabilities'),
  getCurrentInstallDir: () => ipcRenderer.invoke('kobold:getCurrentInstallDir'),
  selectInstallDirectory: () =>
    ipcRenderer.invoke('kobold:selectInstallDirectory'),
  downloadRelease: (asset) =>
    ipcRenderer.invoke('kobold:downloadRelease', asset),
  launchKoboldCpp: (args?: string[], configFilePath?: string) =>
    ipcRenderer.invoke('kobold:launchKoboldCpp', args, configFilePath),
  openInstallDialog: () => ipcRenderer.invoke('kobold:openInstallDialog'),
  checkForUpdates: () => ipcRenderer.invoke('kobold:checkForUpdates'),
  getConfigFiles: () => ipcRenderer.invoke('kobold:getConfigFiles'),
  getSelectedConfig: () => ipcRenderer.invoke('kobold:getSelectedConfig'),
  setSelectedConfig: (configName: string) =>
    ipcRenderer.invoke('kobold:setSelectedConfig', configName),
  parseConfigFile: (filePath: string) =>
    ipcRenderer.invoke('kobold:parseConfigFile', filePath),
  selectModelFile: () => ipcRenderer.invoke('kobold:selectModelFile'),
  stopKoboldCpp: () => ipcRenderer.invoke('kobold:stopKoboldCpp'),
  confirmEject: () => ipcRenderer.invoke('kobold:confirmEject'),
  onDownloadProgress: (callback) => {
    ipcRenderer.on(
      'download-progress',
      (_: IpcRendererEvent, progress: number) => callback(progress)
    );
  },
  onUpdateAvailable: (callback) => {
    ipcRenderer.on(
      'update-available',
      (_: IpcRendererEvent, updateInfo: UpdateInfo) => callback(updateInfo)
    );
  },
  onInstallDirChanged: (callback: (newPath: string) => void) => {
    const handler = (_: IpcRendererEvent, newPath: string) => callback(newPath);
    ipcRenderer.on('install-dir-changed', handler);

    return () => {
      ipcRenderer.removeListener('install-dir-changed', handler);
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
  getVersion: () => ipcRenderer.invoke('app:getVersion'),
  openExternal: (url) => ipcRenderer.invoke('app:openExternal', url),
};

const configAPI: ConfigAPI = {
  getServerOnly: () => ipcRenderer.invoke('config:getServerOnly'),
  setServerOnly: (serverOnly: boolean) =>
    ipcRenderer.invoke('config:setServerOnly', serverOnly),
  get: (key: string) => ipcRenderer.invoke('config:get', key),
  set: (key: string, value: unknown) =>
    ipcRenderer.invoke('config:set', key, value),
};

contextBridge.exposeInMainWorld('electronAPI', {
  kobold: koboldAPI,
  app: appAPI,
  config: configAPI,
});
