import { join } from 'path';
import { readdir, stat, unlink } from 'fs/promises';
import { dialog } from 'electron';

import { getInstallDir, setInstallDir } from '../config';
import { logError } from '@/utils/node/logging';
import { pathExists, readJsonFile, writeJsonFile } from '@/utils/node/fs';
import { getMainWindow, sendToRenderer } from '../window';
import { PRODUCT_NAME } from '@/constants';
import type { KoboldConfig } from '@/types/electron';

export async function getConfigFiles() {
  const configFiles: { name: string; path: string; size: number }[] = [];

  try {
    const installDir = getInstallDir();
    if (await pathExists(installDir)) {
      const files = await readdir(installDir);

      for (const file of files) {
        const filePath = join(installDir, file);

        const stats = await stat(filePath);
        if (
          stats.isFile() &&
          (file.endsWith('.kcpps') ||
            file.endsWith('.kcppt') ||
            file.endsWith('.json'))
        ) {
          configFiles.push({
            name: file,
            path: filePath,
            size: stats.size,
          });
        }
      }
    }
  } catch (error) {
    logError('Error scanning for config files:', error as Error);
  }

  return configFiles.sort((a, b) => a.name.localeCompare(b.name));
}

export async function parseConfigFile(filePath: string) {
  try {
    if (!(await pathExists(filePath))) {
      return null;
    }

    const config = await readJsonFile(filePath);
    return config as KoboldConfig;
  } catch (error) {
    logError('Error parsing config file:', error as Error);
    return null;
  }
}

export async function saveConfigFile(
  configFileName: string,
  configData: KoboldConfig
) {
  try {
    const installDir = getInstallDir();
    const configPath = join(installDir, configFileName);
    await writeJsonFile(configPath, configData);
    return true;
  } catch (error) {
    logError('Error saving config file:', error as Error);
    return false;
  }
}

export async function deleteConfigFile(configFileName: string) {
  try {
    const installDir = getInstallDir();
    const configPath = join(installDir, configFileName);
    await unlink(configPath);
    return true;
  } catch (error) {
    logError('Error deleting config file:', error as Error);
    return false;
  }
}

export async function selectModelFile(title = 'Select Model File') {
  try {
    const mainWindow = getMainWindow();
    if (!mainWindow) {
      return null;
    }

    const result = await dialog.showOpenDialog(mainWindow, {
      title,
      filters: [
        {
          name: 'Model Files',
          extensions: ['gguf', 'safetensors'],
        },
        { name: 'All Files', extensions: ['*'] },
      ],
      properties: ['openFile'],
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    return result.filePaths[0];
  } catch (error) {
    logError('Error selecting model file:', error as Error);
    return null;
  }
}

export async function selectInstallDirectory() {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory', 'createDirectory'],
    title: `Select the ${PRODUCT_NAME} Installation Directory`,
    defaultPath: getInstallDir(),
    buttonLabel: 'Select Directory',
  });

  if (!result.canceled && result.filePaths.length > 0) {
    await setInstallDir(result.filePaths[0]);

    sendToRenderer('install-dir-changed', result.filePaths[0]);

    return result.filePaths[0];
  }

  return null;
}
