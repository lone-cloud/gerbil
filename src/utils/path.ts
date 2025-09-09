import { join } from 'path';
import { homedir } from 'os';
import { PRODUCT_NAME, CONFIG_FILE_NAME } from '@/constants';

export function getConfigDir(): string {
  return join(getConfigDirPath(), CONFIG_FILE_NAME);
}

function getConfigDirPath(): string {
  const platform = process.platform;
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
