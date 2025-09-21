import { join } from 'path';
import { homedir } from 'os';
import { platform, resourcesPath } from 'process';
import { PRODUCT_NAME, CONFIG_FILE_NAME } from '@/constants';
import { isDevelopment } from './environment';

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
