import { readdir, stat, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { dialog } from 'electron';
import { PRODUCT_NAME } from '@/constants';
import type { KoboldConfig } from '@/types/electron';
import { pathExists, readJsonFile, writeJsonFile } from '@/utils/node/fs';
import { logError, safeExecute, tryExecute } from '@/utils/node/logging';
import { getInstallDir, setInstallDir } from '../config';
import { getMainWindow, sendToRenderer } from '../window';

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
          (file.endsWith('.kcpps') || file.endsWith('.kcppt') || file.endsWith('.json'))
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
  return safeExecute(async () => {
    if (!(await pathExists(filePath))) {
      return null;
    }

    const config = await readJsonFile(filePath);
    return config as KoboldConfig;
  }, 'Error parsing config file');
}

export async function saveConfigFile(configFileName: string, configData: KoboldConfig) {
  return tryExecute(async () => {
    const installDir = getInstallDir();
    const configPath = join(installDir, configFileName);
    await writeJsonFile(configPath, configData);
  }, 'Error saving config file');
}

export async function deleteConfigFile(configFileName: string) {
  return tryExecute(async () => {
    const installDir = getInstallDir();
    const configPath = join(installDir, configFileName);
    await unlink(configPath);
  }, 'Error deleting config file');
}

export async function selectModelFile(title = 'Select Model File') {
  return safeExecute(async () => {
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
  }, 'Error selecting model file');
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
