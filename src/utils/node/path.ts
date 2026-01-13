import { homedir } from 'node:os';
import { join } from 'node:path';
import { platform, resourcesPath } from 'node:process';
import { shell } from 'electron';
import { CONFIG_FILE_NAME, PRODUCT_NAME } from '@/constants';
import { safeExecute } from '@/utils/logger';
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

export const openUrl = async (url: string) =>
  (await safeExecute(async () => {
    await shell.openExternal(url);
    return { success: true };
  }, 'Failed to open external URL')) || {
    success: false,
    error: 'Failed to open external URL',
  };
