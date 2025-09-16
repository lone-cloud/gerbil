import { ipcMain, shell, app } from 'electron';
import { join } from 'path';
import * as os from 'os';
import type { MantineColorScheme } from '@mantine/core';
import {
  launchKoboldCpp,
  downloadRelease,
  getInstalledVersions,
  getCurrentVersion,
  getConfigFiles,
  saveConfigFile,
  setCurrentVersion,
  selectInstallDirectory,
  stopKoboldCpp,
  parseConfigFile,
  selectModelFile,
} from '@/main/modules/koboldcpp';
import {
  get as getConfig,
  set as setConfig,
  getSelectedConfig,
  setSelectedConfig,
  getInstallDir,
  getColorScheme,
  setColorScheme,
} from '@/main/modules/config';
import { logError } from '@/main/modules/logging';
import { getSillyTavernManager } from '@/main/modules/sillytavern';
import {
  startFrontend as startOpenWebUIFrontend,
  stopFrontend as stopOpenWebUIFrontend,
} from '@/main/modules/openwebui';
import {
  startFrontend as startComfyUIFrontend,
  stopFrontend as stopComfyUIFrontend,
} from '@/main/modules/comfyui';
import {
  isUvAvailable,
  isNpxAvailable,
  getUvVersion,
  getSystemNodeVersion,
} from '@/main/modules/dependencies';
import { parseKoboldConfig } from '@/utils/node/kobold';
import { getMainWindow } from '@/main/modules/window';
import {
  detectGPU,
  detectCPU,
  detectGPUCapabilities,
  detectGPUMemory,
  detectROCm,
} from '@/main/modules/hardware';
import {
  detectBackendSupport,
  getAvailableBackends,
} from '@/main/modules/binary';
import { openPerformanceManager } from '@/main/modules/performance';
import { startMonitoring, stopMonitoring } from '@/main/modules/monitoring';
import type { FrontendPreference } from '@/types';
import { getAppVersion } from '@/utils/node/fs';

async function launchKoboldCppWithCustomFrontends(args: string[] = []) {
  try {
    const frontendPreference = (await getConfig(
      'frontendPreference'
    )) as FrontendPreference;

    const result = await launchKoboldCpp(args, frontendPreference);

    const { isImageMode } = parseKoboldConfig(args);

    if (frontendPreference === 'sillytavern') {
      getSillyTavernManager().startFrontend(args);
    } else if (frontendPreference === 'openwebui') {
      startOpenWebUIFrontend(args);
    } else if (frontendPreference === 'comfyui' && isImageMode) {
      startComfyUIFrontend(args);
    }

    return result;
  } catch (error) {
    logError('Error in enhanced launch:', error as Error);
    return {
      success: false,
      error: (error as Error).message,
    };
  }
}

export function setupIPCHandlers() {
  ipcMain.handle('kobold:downloadRelease', async (_, asset) => ({
    success: true,
    path: await downloadRelease(asset),
  }));

  ipcMain.handle('kobold:getInstalledVersions', () => getInstalledVersions());

  ipcMain.handle('kobold:getCurrentVersion', () => getCurrentVersion());

  ipcMain.handle('kobold:getConfigFiles', () => getConfigFiles());

  ipcMain.handle('kobold:saveConfigFile', async (_, configName, configData) =>
    saveConfigFile(configName, configData)
  );

  ipcMain.handle('kobold:getSelectedConfig', () => getSelectedConfig());

  ipcMain.handle('kobold:setSelectedConfig', (_, configName) =>
    setSelectedConfig(configName)
  );

  ipcMain.handle('kobold:setCurrentVersion', (_, version) =>
    setCurrentVersion(version)
  );

  ipcMain.handle('kobold:getCurrentInstallDir', () => getInstallDir());

  ipcMain.handle('kobold:selectInstallDirectory', () =>
    selectInstallDirectory()
  );

  ipcMain.handle('kobold:detectGPU', () => detectGPU());

  ipcMain.handle('kobold:detectCPU', () => detectCPU());

  ipcMain.handle('kobold:detectGPUCapabilities', () => detectGPUCapabilities());

  ipcMain.handle('kobold:detectGPUMemory', () => detectGPUMemory());

  ipcMain.handle('kobold:detectROCm', () => detectROCm());

  ipcMain.handle('kobold:detectBackendSupport', () => detectBackendSupport());

  ipcMain.handle('kobold:getAvailableBackends', (_, includeDisabled = false) =>
    getAvailableBackends(includeDisabled)
  );

  ipcMain.handle('kobold:getPlatform', () => process.platform);

  ipcMain.handle('kobold:launchKoboldCpp', (_, args) =>
    launchKoboldCppWithCustomFrontends(args)
  );

  ipcMain.handle('kobold:stopKoboldCpp', () => {
    stopKoboldCpp();
    getSillyTavernManager().stopFrontend();
    stopOpenWebUIFrontend();
    stopComfyUIFrontend();
  });

  ipcMain.handle('kobold:parseConfigFile', (_, filePath) =>
    parseConfigFile(filePath)
  );

  ipcMain.handle('kobold:selectModelFile', (_, title) =>
    selectModelFile(title)
  );

  ipcMain.handle('config:get', (_, key) => getConfig(key));

  ipcMain.handle('config:set', (_, key, value) => setConfig(key, value));

  ipcMain.handle('app:getVersion', () => getAppVersion());

  ipcMain.handle('app:getVersionInfo', async () => {
    const [appVersion, nodeJsSystemVersion, uvVersion] = await Promise.all([
      getAppVersion(),
      getSystemNodeVersion(),
      getUvVersion(),
    ]);

    return {
      appVersion,
      electronVersion: process.versions.electron,
      nodeVersion: process.versions.node,
      chromeVersion: process.versions.chrome,
      v8Version: process.versions.v8,
      osVersion: os.release(),
      platform: process.platform,
      arch: process.arch,
      nodeJsSystemVersion,
      uvVersion,
    };
  });

  ipcMain.handle('app:showLogsFolder', async () => {
    try {
      const logsDir = join(app.getPath('userData'), 'logs');
      await shell.openPath(logsDir);
      return { success: true };
    } catch (error) {
      logError('Failed to open logs folder:', error as Error);
      throw new Error(
        `Failed to open logs folder: ${(error as Error).message}`
      );
    }
  });

  ipcMain.handle('app:minimizeWindow', () => {
    const mainWindow = getMainWindow();
    mainWindow?.minimize();
  });

  ipcMain.handle('app:maximizeWindow', () => {
    const mainWindow = getMainWindow();
    if (mainWindow?.isMaximized()) {
      mainWindow.restore();
    } else {
      mainWindow?.maximize();
    }
  });

  ipcMain.handle('app:closeWindow', () => {
    const mainWindow = getMainWindow();
    mainWindow?.close();
  });

  ipcMain.handle('app:getZoomLevel', async () => {
    const mainWindow = getMainWindow();
    if (mainWindow) {
      return mainWindow.webContents.getZoomLevel();
    }
    return 0;
  });

  ipcMain.handle('app:setZoomLevel', async (_, level: number) => {
    const mainWindow = getMainWindow();
    if (mainWindow) {
      mainWindow.webContents.setZoomLevel(level);
      await setConfig('zoomLevel', level);
    }
  });

  ipcMain.handle('app:getColorScheme', () => getColorScheme());

  ipcMain.handle(
    'app:setColorScheme',
    async (_, colorScheme: MantineColorScheme) => {
      await setColorScheme(colorScheme);
    }
  );

  ipcMain.handle('app:openExternal', async (_, url: string) => {
    try {
      await shell.openExternal(url);
      return { success: true };
    } catch (error) {
      logError('Failed to open external URL:', error as Error);
      throw new Error(
        `Failed to open external URL: ${(error as Error).message}`
      );
    }
  });

  const mainWindow = getMainWindow();
  if (mainWindow) {
    mainWindow.webContents.once('did-finish-load', async () => {
      const savedZoomLevel = await getConfig('zoomLevel');
      if (typeof savedZoomLevel === 'number') {
        mainWindow.webContents.setZoomLevel(savedZoomLevel);
      }
    });
  }

  ipcMain.handle('app:openPerformanceManager', () => openPerformanceManager());

  ipcMain.handle('logs:logError', (_, message: string, error?: Error) => {
    logError(message, error);
  });

  ipcMain.handle('dependencies:isNpxAvailable', () => isNpxAvailable());

  ipcMain.handle('dependencies:isUvAvailable', () => isUvAvailable());

  ipcMain.handle('monitoring:start', () => {
    const mainWindow = getMainWindow();
    if (mainWindow) {
      startMonitoring(mainWindow);
    }
  });

  ipcMain.handle('monitoring:stop', () => {
    stopMonitoring();
  });
}
