import { autoUpdater } from 'electron-updater';
import { app } from 'electron';
import { platform } from 'process';
import { logError, safeExecute } from '@/utils/node/logging';
import { isDevelopment } from '@/utils/node/environment';
import {
  isAURInstallation,
  isWindowsPortableInstallation,
} from './dependencies';

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

export const checkForUpdates = async () => {
  if (isDevelopment) {
    return false;
  }

  return (
    (await safeExecute(
      () => autoUpdater.checkForUpdates(),
      'Failed to check for updates'
    )) !== null
  );
};

export const downloadUpdate = async () => {
  if (isDevelopment) {
    return false;
  }

  return (
    (await safeExecute(
      () => autoUpdater.downloadUpdate(),
      'Failed to download update'
    )) !== null
  );
};

export function quitAndInstall() {
  if (updateDownloaded) {
    autoUpdater.quitAndInstall(false, true);
  } else {
    logError('No update downloaded to install');
  }
}

export const isUpdateDownloaded = () => updateDownloaded;

export const canAutoUpdate = async () => {
  if (!app.isPackaged) return false;

  if (platform === 'linux' && (await isAURInstallation())) {
    return false;
  }

  if (isWindowsPortableInstallation()) {
    return false;
  }

  return platform === 'win32' || platform === 'darwin' || platform === 'linux';
};

app.on('ready', () => {
  setTimeout(() => {
    void checkForUpdates();
  }, 5000);
});
