import { join } from 'node:path';
import { platform } from 'node:process';
import { app, ipcMain } from 'electron';
import {
  canAutoUpdate,
  checkForUpdates,
  downloadUpdate,
  isUpdateDownloaded,
  quitAndInstall,
} from '@/main/modules/auto-updater';
import {
  getColorScheme,
  get as getConfig,
  getEnableSystemTray,
  getInstallDir,
  getSelectedConfig,
  set as setConfig,
} from '@/main/modules/config';
import {
  getVersionInfo,
  isAURInstallation,
  isNpxAvailable,
  isUvAvailable,
} from '@/main/modules/dependencies';
import {
  detectCPU,
  detectGPU,
  detectGPUCapabilities,
  detectGPUMemory,
  detectROCm,
  detectSystemMemory,
} from '@/main/modules/hardware';
import {
  detectAccelerationSupport,
  getAvailableAccelerations,
} from '@/main/modules/koboldcpp/acceleration';
import { analyzeGGUFModel } from '@/main/modules/koboldcpp/analyze';
import {
  deleteRelease,
  getCurrentBackend,
  getInstalledBackends,
  setCurrentBackend,
} from '@/main/modules/koboldcpp/backend';
import {
  deleteConfigFile,
  getConfigFiles,
  parseConfigFile,
  saveConfigFile,
  selectInstallDirectory,
  selectModelFile,
} from '@/main/modules/koboldcpp/config';
import { downloadRelease, importLocalBackend } from '@/main/modules/koboldcpp/download';
import {
  launchKoboldCppWithCustomFrontends,
  stopKoboldCpp,
} from '@/main/modules/koboldcpp/launcher';
import { getLocalModelsForType } from '@/main/modules/koboldcpp/model-download';
import { openPerformanceManager, startMonitoring, stopMonitoring } from '@/main/modules/monitoring';
import {
  createNewTab,
  deleteTabFile,
  loadNotepadState,
  loadTabContent,
  renameTab,
  saveNotepadState,
  saveTabContent,
} from '@/main/modules/notepad';
import { stopFrontend as stopOpenWebUIFrontend } from '@/main/modules/openwebui';
import { stopFrontend as stopSillyTavernFrontend } from '@/main/modules/sillytavern';
import { createTray, destroyTray, updateTrayState } from '@/main/modules/tray';
import { getMainWindow } from '@/main/modules/window';
import type { Acceleration, Screen } from '@/types';
import { logError } from '@/utils/node/logging';
import { getConfigDir, openPathHandler, openUrl } from '@/utils/node/path';
import { calculateOptimalGpuLayers } from '@/utils/node/vram';

export function setupIPCHandlers() {
  const mainWindow = getMainWindow();

  ipcMain.handle('kobold:downloadRelease', async (_, asset, options) =>
    downloadRelease(asset, options)
  );

  ipcMain.handle('kobold:getInstalledBackends', () => getInstalledBackends());

  ipcMain.handle('kobold:getCurrentBackend', () => getCurrentBackend());

  ipcMain.handle('kobold:getConfigFiles', () => getConfigFiles());

  ipcMain.handle('kobold:saveConfigFile', async (_, configName, configData) =>
    saveConfigFile(configName, configData)
  );

  ipcMain.handle('kobold:deleteConfigFile', async (_, configName) => deleteConfigFile(configName));

  ipcMain.handle('kobold:getSelectedConfig', () => getSelectedConfig());

  ipcMain.handle('kobold:setSelectedConfig', (_, configName) =>
    setConfig('selectedConfig', configName)
  );

  ipcMain.handle('kobold:setCurrentBackend', (_, version) => setCurrentBackend(version));

  ipcMain.handle('kobold:getCurrentInstallDir', () => getInstallDir());

  ipcMain.handle('kobold:selectInstallDirectory', () => selectInstallDirectory());

  ipcMain.handle('kobold:detectGPU', () => detectGPU());

  ipcMain.handle('kobold:detectCPU', () => detectCPU());

  ipcMain.handle('kobold:detectGPUCapabilities', () => detectGPUCapabilities());

  ipcMain.handle('kobold:detectGPUMemory', () => detectGPUMemory());

  ipcMain.handle('kobold:detectSystemMemory', () => detectSystemMemory());

  ipcMain.handle('kobold:detectROCm', () => detectROCm());

  ipcMain.handle('kobold:detectAccelerationSupport', () => detectAccelerationSupport());

  ipcMain.handle('kobold:getAvailableAccelerations', (_, includeDisabled = false) =>
    getAvailableAccelerations(includeDisabled)
  );

  ipcMain.handle('kobold:getPlatform', () => platform);

  ipcMain.handle('kobold:launchKoboldCpp', (_, args, preLaunchCommands) =>
    launchKoboldCppWithCustomFrontends(args, preLaunchCommands)
  );

  ipcMain.handle('kobold:deleteRelease', (_, binaryPath) => deleteRelease(binaryPath));

  ipcMain.handle('kobold:stopKoboldCpp', () => {
    void stopKoboldCpp();
    void stopSillyTavernFrontend();
    void stopOpenWebUIFrontend();
  });

  ipcMain.handle('kobold:parseConfigFile', (_, filePath) => parseConfigFile(filePath));

  ipcMain.handle('kobold:selectModelFile', (_, title) => selectModelFile(title));

  ipcMain.handle('kobold:importLocalBackend', () => importLocalBackend());

  ipcMain.handle('kobold:getLocalModels', (_, paramType: string) =>
    getLocalModelsForType(paramType as Parameters<typeof getLocalModelsForType>[0])
  );

  ipcMain.handle('kobold:analyzeModel', async (_, filePath: string) => analyzeGGUFModel(filePath));

  ipcMain.handle(
    'kobold:calculateOptimalLayers',
    async (
      _,
      modelPath: string,
      contextSize: number,
      availableVramGB: number,
      flashAttention: boolean,
      acceleration: Acceleration
    ) =>
      calculateOptimalGpuLayers({
        modelPath,
        contextSize,
        availableVramGB,
        flashAttention,
        acceleration,
      })
  );

  ipcMain.handle('config:get', (_, key) => getConfig(key));

  ipcMain.on('config:set', (_, key, value) => void setConfig(key, value));

  ipcMain.handle('app:getVersion', () => app.getVersion());

  ipcMain.handle('app:getVersionInfo', () => getVersionInfo());

  ipcMain.handle('app:openPath', async (_, path) => openPathHandler(path));

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

  ipcMain.handle('app:getZoomLevel', () => mainWindow.webContents.getZoomLevel());

  ipcMain.handle('app:setZoomLevel', (_, level) => {
    mainWindow.webContents.setZoomLevel(level);
    void setConfig('zoomLevel', level);
  });

  ipcMain.handle('app:getColorScheme', () => getColorScheme());

  ipcMain.handle('app:setColorScheme', async (_, colorScheme) =>
    setConfig('colorScheme', colorScheme)
  );

  ipcMain.handle('app:getEnableSystemTray', () => getEnableSystemTray());

  ipcMain.handle('app:setEnableSystemTray', async (_, enabled: boolean) => {
    await setConfig('enableSystemTray', enabled);
    if (enabled) {
      createTray();
    } else {
      destroyTray();
    }
  });

  ipcMain.handle('app:getStartMinimizedToTray', () => getConfig('startMinimizedToTray'));

  ipcMain.handle('app:setStartMinimizedToTray', async (_, enabled: boolean) => {
    await setConfig('startMinimizedToTray', enabled);
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

  mainWindow.webContents.once('did-finish-load', () => {
    const savedZoomLevel = getConfig('zoomLevel');
    if (typeof savedZoomLevel === 'number') {
      mainWindow.webContents.setZoomLevel(savedZoomLevel);
    }
  });

  ipcMain.handle('app:openPerformanceManager', () => openPerformanceManager());

  ipcMain.on('logs:logError', (_, message, error?) => logError(message, error));

  ipcMain.handle('dependencies:isNpxAvailable', () => isNpxAvailable());

  ipcMain.handle('dependencies:isUvAvailable', () => isUvAvailable());

  ipcMain.handle('dependencies:clearOpenWebUIData', async () => {
    const { rm } = await import('node:fs/promises');
    const openWebUIDataDir = join(getInstallDir(), 'openwebui-data');
    try {
      await rm(openWebUIDataDir, { recursive: true, force: true });
      return { success: true };
    } catch (error) {
      logError('Failed to clear Open WebUI data:', error as Error);
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.on('monitoring:start', () => startMonitoring(mainWindow));

  ipcMain.on('monitoring:stop', () => stopMonitoring());

  ipcMain.handle('app:checkForUpdates', () => checkForUpdates());

  ipcMain.handle('app:downloadUpdate', () => downloadUpdate());

  ipcMain.handle('app:quitAndInstall', () => quitAndInstall());

  ipcMain.handle('app:isUpdateDownloaded', () => isUpdateDownloaded());

  ipcMain.handle('app:canAutoUpdate', () => canAutoUpdate());

  ipcMain.handle('app:isAURInstallation', () => isAURInstallation());

  ipcMain.handle('notepad:saveTabContent', (_, title, content) => saveTabContent(title, content));

  ipcMain.handle('notepad:loadTabContent', (_, title) => loadTabContent(title));

  ipcMain.handle('notepad:renameTab', (_, oldTitle, newTitle) => renameTab(oldTitle, newTitle));

  ipcMain.handle('notepad:saveState', (_, state) => saveNotepadState(state));

  ipcMain.handle('notepad:loadState', () => loadNotepadState());

  ipcMain.handle('notepad:deleteTab', (_, title) => deleteTabFile(title));

  ipcMain.handle('notepad:createNewTab', (_, title) => createNewTab(title));
}
