import { join } from 'path';
import { resourcesPath } from 'process';
import { isDevelopment } from '@/utils/node/environment';

export function getAssetPath(assetName: string) {
  if (isDevelopment) {
    return join(__dirname, '../../assets', assetName);
  } else {
    return join(resourcesPath, '..', 'assets', assetName);
  }
}
