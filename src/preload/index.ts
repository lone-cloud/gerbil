import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';
import type { KoboldAPI, AppAPI, UpdateInfo } from '../types/electron';

const koboldAPI: KoboldAPI = {
  isInstalled: () => ipcRenderer.invoke('kobold:isInstalled'),
  getInstalledVersion: () => ipcRenderer.invoke('kobold:getInstalledVersion'),
  getInstalledVersions: () => ipcRenderer.invoke('kobold:getInstalledVersions'),
  getCurrentVersion: () => ipcRenderer.invoke('kobold:getCurrentVersion'),
  setCurrentVersion: (version: string) =>
    ipcRenderer.invoke('kobold:setCurrentVersion', version),
  getVersionFromBinary: (binaryPath: string) =>
    ipcRenderer.invoke('kobold:getVersionFromBinary', binaryPath),
  checkForUpdates: () => ipcRenderer.invoke('kobold:checkForUpdates'),
  getLatestReleaseWithStatus: () =>
    ipcRenderer.invoke('kobold:getLatestReleaseWithStatus'),
  getROCmDownload: () => ipcRenderer.invoke('kobold:getROCmDownload'),
  downloadROCm: () => ipcRenderer.invoke('kobold:downloadROCm'),
  getLatestRelease: () => ipcRenderer.invoke('kobold:getLatestRelease'),
  getAllReleases: () => ipcRenderer.invoke('kobold:getAllReleases'),
  getPlatform: () => ipcRenderer.invoke('kobold:getPlatform'),
  detectGPU: () => ipcRenderer.invoke('kobold:detectGPU'),
  getCurrentInstallDir: () => ipcRenderer.invoke('kobold:getCurrentInstallDir'),
  selectInstallDirectory: () =>
    ipcRenderer.invoke('kobold:selectInstallDirectory'),
  downloadRelease: (asset) =>
    ipcRenderer.invoke('kobold:downloadRelease', asset),
  launchKoboldCpp: (args) => ipcRenderer.invoke('kobold:launchKoboldCpp', args),
  openInstallDialog: () => ipcRenderer.invoke('kobold:openInstallDialog'),
  getConfigFiles: () => ipcRenderer.invoke('kobold:getConfigFiles'),
  getSelectedConfig: () => ipcRenderer.invoke('kobold:getSelectedConfig'),
  setSelectedConfig: (configName: string) =>
    ipcRenderer.invoke('kobold:setSelectedConfig', configName),
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
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  },
};

const appAPI: AppAPI = {
  getVersion: () => ipcRenderer.invoke('app:getVersion'),
  openExternal: (url) => ipcRenderer.invoke('app:openExternal', url),
};

contextBridge.exposeInMainWorld('electronAPI', {
  kobold: koboldAPI,
  app: appAPI,
});
