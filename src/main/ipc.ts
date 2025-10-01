import { ipcMain, app } from 'electron';
import { join } from 'path';
import { release } from 'os';
import { platform, versions, arch } from 'process';
import type { Screen } from '@/types';
import {
  stopKoboldCpp,
  launchKoboldCppWithCustomFrontends,
} from '@/main/modules/koboldcpp/launcher';
import { downloadRelease } from '@/main/modules/koboldcpp/download';
import {
  getInstalledVersions,
  getCurrentVersion,
  setCurrentVersion,
  deleteRelease,
} from '@/main/modules/koboldcpp/version';
import {
  getConfigFiles,
  saveConfigFile,
  deleteConfigFile,
  parseConfigFile,
  selectModelFile,
  selectInstallDirectory,
} from '@/main/modules/koboldcpp/config';
import {
  get as getConfig,
  set as setConfig,
  getSelectedConfig,
  getInstallDir,
  getColorScheme,
  getEnableSystemTray,
} from '@/main/modules/config';
import { createTray, updateTrayState } from '@/main/modules/tray';
import { getConfigDir, openPathHandler, openUrl } from '@/utils/node/path';
import { logError } from '@/utils/node/logging';
import { stopFrontend as stopSillyTavernFrontend } from '@/main/modules/sillytavern';
import { stopFrontend as stopOpenWebUIFrontend } from '@/main/modules/openwebui';
import { stopFrontend as stopComfyUIFrontend } from '@/main/modules/comfyui';
import {
  isUvAvailable,
  isNpxAvailable,
  getUvVersion,
  getSystemNodeVersion,
  getAURVersion,
} from '@/main/modules/dependencies';
import { getMainWindow } from '@/main/modules/window';
import {
  saveTabContent,
  loadTabContent,
  saveNotepadState,
  loadNotepadState,
  deleteTabFile,
  createNewTab,
  renameTab,
} from '@/main/modules/notepad';
import {
  detectGPU,
  detectCPU,
  detectGPUCapabilities,
  detectGPUMemory,
  detectROCm,
  detectSystemMemory,
} from '@/main/modules/hardware';
import {
  detectBackendSupport,
  getAvailableBackends,
} from '@/main/modules/koboldcpp/backend';
import {
  openPerformanceManager,
  startMonitoring,
  stopMonitoring,
} from '@/main/modules/monitoring';
import {
  checkForUpdates,
  downloadUpdate,
  quitAndInstall,
  isUpdateDownloaded,
  canAutoUpdate,
} from '@/main/modules/autoUpdater';

export function setupIPCHandlers() {
  const mainWindow = getMainWindow();

  ipcMain.handle('kobold:downloadRelease', async (_, asset, options) =>
    downloadRelease(asset, options)
  );

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
    setConfig('selectedConfig', configName)
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

  ipcMain.handle('kobold:detectSystemMemory', () => detectSystemMemory());

  ipcMain.handle('kobold:detectROCm', () => detectROCm());

  ipcMain.handle('kobold:detectBackendSupport', () => detectBackendSupport());

  ipcMain.handle('kobold:getAvailableBackends', (_, includeDisabled = false) =>
    getAvailableBackends(includeDisabled)
  );

  ipcMain.handle('kobold:getPlatform', () => platform);

  ipcMain.handle('kobold:launchKoboldCpp', (_, args) =>
    launchKoboldCppWithCustomFrontends(args)
  );

  ipcMain.handle('kobold:deleteRelease', (_, binaryPath) =>
    deleteRelease(binaryPath)
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

  ipcMain.handle('app:getVersion', () => app.getVersion());

  ipcMain.handle('app:getVersionInfo', async () => {
    const [appVersion, nodeJsSystemVersion, uvVersion, aurPackageVersion] =
      await Promise.all([
        app.getVersion(),
        getSystemNodeVersion(),
        getUvVersion(),
        getAURVersion(),
      ]);

    return {
      appVersion,
      electronVersion: versions.electron,
      nodeVersion: versions.node,
      chromeVersion: versions.chrome,
      v8Version: versions.v8,
      osVersion: release(),
      platform,
      arch,
      nodeJsSystemVersion,
      uvVersion,
      aurPackageVersion,
    };
  });

  ipcMain.handle('app:openPath', (_, path) => openPathHandler(path));

  ipcMain.handle('app:showLogsFolder', () =>
    openPathHandler(join(app.getPath('userData'), 'logs'))
  );

  ipcMain.handle('app:viewConfigFile', () => openPathHandler(getConfigDir()));

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

  ipcMain.handle('app:setZoomLevel', (_, level) => {
    mainWindow.webContents.setZoomLevel(level);
    setConfig('zoomLevel', level);
  });

  ipcMain.handle('app:getColorScheme', () => getColorScheme());

  ipcMain.handle('app:setColorScheme', (_, colorScheme) =>
    setConfig('colorScheme', colorScheme)
  );

  ipcMain.handle('app:getEnableSystemTray', () => getEnableSystemTray());

  ipcMain.handle('app:setEnableSystemTray', async (_, enabled: boolean) => {
    await setConfig('enableSystemTray', enabled);
    createTray();
  });

  ipcMain.handle(
    'app:updateTrayState',
    (
      _,
      state: {
        screen?: Screen | null;
        model?: string | null;
        config?: string | null;
        monitoringEnabled?: boolean;
      }
    ) => {
      updateTrayState(state);
    }
  );

  ipcMain.handle('app:openExternal', async (_, url) => openUrl(url));

  mainWindow.webContents.once('did-finish-load', async () => {
    const savedZoomLevel = await getConfig('zoomLevel');
    if (typeof savedZoomLevel === 'number') {
      mainWindow.webContents.setZoomLevel(savedZoomLevel);
    }
  });

  ipcMain.handle('app:openPerformanceManager', () => openPerformanceManager());

  ipcMain.on('logs:logError', (_, message, error?) => logError(message, error));

  ipcMain.handle('dependencies:isNpxAvailable', () => isNpxAvailable());

  ipcMain.handle('dependencies:isUvAvailable', () => isUvAvailable());

  ipcMain.on('monitoring:start', () => startMonitoring(mainWindow));

  ipcMain.on('monitoring:stop', () => stopMonitoring());

  ipcMain.handle('app:checkForUpdates', () => checkForUpdates());

  ipcMain.handle('app:downloadUpdate', () => downloadUpdate());

  ipcMain.handle('app:quitAndInstall', () => quitAndInstall());

  ipcMain.handle('app:isUpdateDownloaded', () => isUpdateDownloaded());

  ipcMain.handle('app:canAutoUpdate', () => canAutoUpdate());

  ipcMain.handle('app:isAURInstallation', async () => {
    const aurPackageVersion = await getAURVersion();
    return aurPackageVersion !== null;
  });

  ipcMain.handle('notepad:saveTabContent', (_, title, content) =>
    saveTabContent(title, content)
  );

  ipcMain.handle('notepad:loadTabContent', (_, title) => loadTabContent(title));

  ipcMain.handle('notepad:renameTab', (_, oldTitle, newTitle) =>
    renameTab(oldTitle, newTitle)
  );

  ipcMain.handle('notepad:saveState', (_, state) => saveNotepadState(state));

  ipcMain.handle('notepad:loadState', () => loadNotepadState());

  ipcMain.handle('notepad:deleteTab', (_, title) => deleteTabFile(title));

  ipcMain.handle('notepad:createNewTab', (_, title) => createNewTab(title));
}
