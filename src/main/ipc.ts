import { ipcMain, shell, app } from 'electron';
import { join } from 'path';
import * as os from 'os';
import { platform, versions, arch } from 'process';
import type { MantineColorScheme } from '@mantine/core';
import {
  launchKoboldCpp,
  downloadRelease,
  getInstalledVersions,
  getCurrentVersion,
  getConfigFiles,
  saveConfigFile,
  deleteConfigFile,
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
import { getConfigDir } from '@/utils/node/path';
import { logError } from '@/main/modules/logging';
import { safeExecute } from '@/utils/node/logger';
import {
  startFrontend as startSillyTavernFrontend,
  stopFrontend as stopSillyTavernFrontend,
} from '@/main/modules/sillytavern';
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
  isAURInstallation,
  isWindowsPortableInstallation,
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
import {
  checkForUpdates,
  downloadUpdate,
  quitAndInstall,
  isUpdateDownloaded,
} from '@/main/modules/autoUpdater';
import type { FrontendPreference } from '@/types';
import { getAppVersion } from '@/utils/node/fs';

const launchKoboldCppWithCustomFrontends = async (args: string[] = []) =>
  (await safeExecute(async () => {
    const frontendPreference = (await getConfig(
      'frontendPreference'
    )) as FrontendPreference;

    const result = await launchKoboldCpp(args, frontendPreference);

    const { isImageMode } = parseKoboldConfig(args);

    if (frontendPreference === 'sillytavern') {
      startSillyTavernFrontend(args);
    } else if (frontendPreference === 'openwebui') {
      startOpenWebUIFrontend(args);
    } else if (frontendPreference === 'comfyui' && isImageMode) {
      startComfyUIFrontend(args);
    }

    return result;
  }, 'Error in enhanced launch')) || {
    success: false,
    error: 'Launch failed',
  };

export function setupIPCHandlers() {
  const mainWindow = getMainWindow();

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

  ipcMain.handle('kobold:deleteConfigFile', async (_, configName) =>
    deleteConfigFile(configName)
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

  ipcMain.handle('kobold:getPlatform', () => platform);

  ipcMain.handle('kobold:launchKoboldCpp', (_, args) =>
    launchKoboldCppWithCustomFrontends(args)
  );

  ipcMain.handle('kobold:stopKoboldCpp', () => {
    stopKoboldCpp();
    stopSillyTavernFrontend();
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

  ipcMain.on('config:set', (_, key, value) => setConfig(key, value));

  ipcMain.handle('app:getVersion', () => getAppVersion());

  ipcMain.handle('app:getVersionInfo', async () => {
    const [appVersion, nodeJsSystemVersion, uvVersion, isAUR] =
      await Promise.all([
        getAppVersion(),
        getSystemNodeVersion(),
        getUvVersion(),
        isAURInstallation(),
      ]);

    return {
      appVersion,
      electronVersion: versions.electron,
      nodeVersion: versions.node,
      chromeVersion: versions.chrome,
      v8Version: versions.v8,
      osVersion: os.release(),
      platform,
      arch,
      nodeJsSystemVersion,
      uvVersion,
      isAUR,
    };
  });

  const openPathHandler = async (path: string) =>
    (await safeExecute(async () => {
      await shell.openPath(path);
      return { success: true };
    }, 'Failed to open path')) || {
      success: false,
      error: 'Failed to open path',
    };

  ipcMain.handle('app:openPath', (_, path: string) => openPathHandler(path));

  ipcMain.handle('app:showLogsFolder', () => {
    const logsDir = join(app.getPath('userData'), 'logs');
    return openPathHandler(logsDir);
  });

  ipcMain.handle('app:viewConfigFile', () => {
    const configDir = getConfigDir();
    return openPathHandler(configDir);
  });

  ipcMain.handle('app:minimizeWindow', () => mainWindow.minimize());

  ipcMain.handle('app:maximizeWindow', () => {
    if (mainWindow.isMaximized()) {
      mainWindow.restore();
    } else {
      mainWindow.maximize();
    }
  });

  ipcMain.handle('app:closeWindow', () => mainWindow.close());

  ipcMain.handle('app:isMaximized', () => mainWindow.isMaximized());

  ipcMain.handle('app:getZoomLevel', () =>
    mainWindow.webContents.getZoomLevel()
  );

  ipcMain.handle('app:setZoomLevel', (_, level: number) => {
    mainWindow.webContents.setZoomLevel(level);
    setConfig('zoomLevel', level);
  });

  ipcMain.handle('app:getColorScheme', () => getColorScheme());

  ipcMain.handle('app:setColorScheme', (_, colorScheme: MantineColorScheme) =>
    setColorScheme(colorScheme)
  );

  ipcMain.handle(
    'app:openExternal',
    async (_, url: string) =>
      (await safeExecute(async () => {
        await shell.openExternal(url);
        return { success: true };
      }, 'Failed to open external URL')) || {
        success: false,
        error: 'Failed to open external URL',
      }
  );

  mainWindow.webContents.once('did-finish-load', async () => {
    const savedZoomLevel = await getConfig('zoomLevel');
    if (typeof savedZoomLevel === 'number') {
      mainWindow.webContents.setZoomLevel(savedZoomLevel);
    }
  });

  ipcMain.handle('app:openPerformanceManager', () => openPerformanceManager());

  ipcMain.on('logs:logError', (_, message: string, error?: Error) =>
    logError(message, error)
  );

  ipcMain.handle('dependencies:isNpxAvailable', () => isNpxAvailable());

  ipcMain.handle('dependencies:isUvAvailable', () => isUvAvailable());

  ipcMain.on('monitoring:start', () => startMonitoring(mainWindow));

  ipcMain.on('monitoring:stop', () => stopMonitoring());

  ipcMain.handle('app:checkForUpdates', () => checkForUpdates());

  ipcMain.handle('app:downloadUpdate', () => downloadUpdate());

  ipcMain.handle('app:quitAndInstall', () => quitAndInstall());

  ipcMain.handle('app:isUpdateDownloaded', () => isUpdateDownloaded());

  ipcMain.handle('app:canAutoUpdate', async () => {
    if (!app.isPackaged) return false;

    if (platform === 'linux' && (await isAURInstallation())) {
      return false;
    }

    if (isWindowsPortableInstallation()) {
      return false;
    }

    return (
      platform === 'win32' || platform === 'darwin' || platform === 'linux'
    );
  });

  ipcMain.handle('app:isAURInstallation', () => isAURInstallation());
}
