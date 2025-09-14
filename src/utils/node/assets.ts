import { join } from 'path';
import { isDevelopment } from '@/utils/node/environment';

export function getAssetPath(assetName: string) {
  if (isDevelopment) {
    return join(__dirname, '../../assets', assetName);
  } else {
    return join(process.resourcesPath, '..', 'assets', assetName);
  }
}
