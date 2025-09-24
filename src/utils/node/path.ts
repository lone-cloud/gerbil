import { join } from 'path';
import { homedir } from 'os';
import { platform, resourcesPath } from 'process';
import { shell } from 'electron';

import { safeExecute } from '@/utils/logger';
import { PRODUCT_NAME, CONFIG_FILE_NAME } from '@/constants';
import { isDevelopment } from './environment';
import { pathExists } from './fs';

export const getConfigDir = () => join(getConfigDirPath(), CONFIG_FILE_NAME);

function getConfigDirPath() {
  const home = homedir();

  switch (platform) {
    case 'win32':
      return join(home, 'AppData', 'Roaming', PRODUCT_NAME);
    case 'darwin':
      return join(home, 'Library', 'Application Support', PRODUCT_NAME);
    default:
      return join(home, '.config', PRODUCT_NAME);
  }
}

export const getAssetPath = (assetName: string) =>
  isDevelopment
    ? join(__dirname, '../../assets', assetName)
    : join(resourcesPath, '..', 'assets', assetName);

export async function getLauncherPath(unpackedDir: string) {
  const extensions = platform === 'win32' ? ['.exe', ''] : ['', '.exe'];

  for (const ext of extensions) {
    const launcherPath = join(unpackedDir, `koboldcpp-launcher${ext}`);
    if (await pathExists(launcherPath)) {
      return launcherPath;
    }
  }

  return null;
}

export const openPathHandler = async (path: string) =>
  (await safeExecute(async () => {
    await shell.openPath(path);
    return { success: true };
  }, 'Failed to open path')) || {
    success: false,
    error: 'Failed to open path',
  };

export const openUrl = (url: string) =>
  safeExecute(async () => {
    await shell.openExternal(url);
    return { success: true };
  }, 'Failed to open external URL') || {
    success: false,
    error: 'Failed to open external URL',
  };
