import { autoUpdater } from 'electron-updater';
import { app } from 'electron';
import { logError } from '@/main/modules/logging';
import { safeExecute } from '@/utils/node/logger';

export interface UpdateInfo {
  version: string;
  releaseNotes?: string;
  releaseDate: string;
  size?: number;
}

export interface UpdateProgress {
  bytesPerSecond: number;
  percent: number;
  transferred: number;
  total: number;
}

let updateDownloaded = false;

function setupAutoUpdater() {
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('error', (error) => {
    logError('Auto-updater error:', error);
  });

  autoUpdater.on('update-downloaded', () => {
    updateDownloaded = true;
  });
}

setupAutoUpdater();

export const checkForUpdates = async () =>
  (await safeExecute(
    () => autoUpdater.checkForUpdates(),
    'Failed to check for updates'
  )) !== null;

export const downloadUpdate = async () =>
  (await safeExecute(
    () => autoUpdater.downloadUpdate(),
    'Failed to download update'
  )) !== null;

export function quitAndInstall() {
  if (updateDownloaded) {
    autoUpdater.quitAndInstall(false, true);
  } else {
    logError('No update downloaded to install');
  }
}

export function isUpdateDownloaded() {
  return updateDownloaded;
}

app.on('ready', () => {
  setTimeout(() => {
    void checkForUpdates();
  }, 5000);
});
