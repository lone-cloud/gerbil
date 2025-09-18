import { autoUpdater } from 'electron-updater';
import { app } from 'electron';
import { logError } from '@/main/modules/logging';

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

export async function checkForUpdates() {
  try {
    const result = await autoUpdater.checkForUpdates();
    return result !== null;
  } catch (error) {
    logError('Failed to check for updates:', error as Error);
    return false;
  }
}

export async function downloadUpdate() {
  try {
    await autoUpdater.downloadUpdate();
    return true;
  } catch (error) {
    logError('Failed to download update:', error as Error);
    return false;
  }
}

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
