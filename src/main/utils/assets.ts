import { join } from 'path';
import { app } from 'electron';

export const getAssetPath = (filename: string): string => {
  if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
    return join(__dirname, '../..', 'src/assets', filename);
  }
  return join(process.resourcesPath, 'assets', filename);
};
