import { ipcMain, shell, app } from 'electron';
import * as os from 'os';
import type { KoboldCppManager } from '@/main/managers/KoboldCppManager';
import type { ConfigManager } from '@/main/managers/ConfigManager';
import type { LogManager } from '@/main/managers/LogManager';
import type { SillyTavernManager } from '@/main/managers/SillyTavernManager';
import type { OpenWebUIManager } from '@/main/managers/OpenWebUIManager';
import type { WindowManager } from '@/main/managers/WindowManager';
import { HardwareManager } from '@/main/managers/HardwareManager';
import { BinaryManager } from '@/main/managers/BinaryManager';

export class IPCHandlers {
  private koboldManager: KoboldCppManager;
  private configManager: ConfigManager;
  private logManager: LogManager;
  private sillyTavernManager: SillyTavernManager;
  private openWebUIManager: OpenWebUIManager;
  private hardwareManager: HardwareManager;
  private binaryManager: BinaryManager;
  private windowManager: WindowManager;

  constructor(
    koboldManager: KoboldCppManager,
    configManager: ConfigManager,
    hardwareManager: HardwareManager,
    binaryManager: BinaryManager,
    logManager: LogManager,
    sillyTavernManager: SillyTavernManager,
    openWebUIManager: OpenWebUIManager,
    windowManager: WindowManager
  ) {
    this.koboldManager = koboldManager;
    this.configManager = configManager;
    this.logManager = logManager;
    this.sillyTavernManager = sillyTavernManager;
    this.openWebUIManager = openWebUIManager;
    this.hardwareManager = hardwareManager;
    this.binaryManager = binaryManager;
    this.windowManager = windowManager;
  }

  private async launchKoboldCppWithCustomFrontends(args: string[] = []) {
    try {
      const result = await this.koboldManager.launchKoboldCpp(args);

      const frontendPreference =
        await this.configManager.get('frontendPreference');

      if (frontendPreference === 'sillytavern') {
        this.sillyTavernManager.startFrontend(args);
      } else if (frontendPreference === 'openwebui') {
        this.openWebUIManager.startFrontend(args);
      }

      return result;
    } catch (error) {
      this.logManager.logError('Error in enhanced launch:', error as Error);
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  setupHandlers() {
    ipcMain.handle('kobold:downloadRelease', async (_, asset) => ({
      success: true,
      path: await this.koboldManager.downloadRelease(asset),
    }));

    ipcMain.handle('kobold:getInstalledVersions', () =>
      this.koboldManager.getInstalledVersions()
    );

    ipcMain.handle('kobold:getCurrentVersion', () =>
      this.koboldManager.getCurrentVersion()
    );

    ipcMain.handle('kobold:getConfigFiles', () =>
      this.koboldManager.getConfigFiles()
    );

    ipcMain.handle('kobold:saveConfigFile', async (_, configName, configData) =>
      this.koboldManager.saveConfigFile(configName, configData)
    );

    ipcMain.handle('kobold:getSelectedConfig', () =>
      this.configManager.getSelectedConfig()
    );

    ipcMain.handle('kobold:setSelectedConfig', (_, configName) =>
      this.configManager.setSelectedConfig(configName)
    );

    ipcMain.handle('kobold:setCurrentVersion', (_, version) =>
      this.koboldManager.setCurrentVersion(version)
    );

    ipcMain.handle('kobold:getCurrentInstallDir', () =>
      this.configManager.getInstallDir()
    );

    ipcMain.handle('kobold:selectInstallDirectory', () =>
      this.koboldManager.selectInstallDirectory()
    );

    ipcMain.handle('kobold:detectGPU', () => this.hardwareManager.detectGPU());

    ipcMain.handle('kobold:detectCPU', () => this.hardwareManager.detectCPU());

    ipcMain.handle('kobold:detectGPUCapabilities', () =>
      this.hardwareManager.detectGPUCapabilities()
    );

    ipcMain.handle('kobold:detectGPUMemory', () =>
      this.hardwareManager.detectGPUMemory()
    );

    ipcMain.handle('kobold:detectROCm', () =>
      this.hardwareManager.detectROCm()
    );

    ipcMain.handle('kobold:detectBackendSupport', () =>
      this.binaryManager.detectBackendSupport()
    );

    ipcMain.handle(
      'kobold:getAvailableBackends',
      (_, includeDisabled = false) =>
        this.binaryManager.getAvailableBackends(includeDisabled)
    );

    ipcMain.handle('kobold:getPlatform', () => process.platform);

    ipcMain.handle('kobold:launchKoboldCpp', (_, args) =>
      this.launchKoboldCppWithCustomFrontends(args)
    );

    ipcMain.handle('kobold:stopKoboldCpp', () => {
      this.koboldManager.stopKoboldCpp();
      this.sillyTavernManager.stopFrontend();
      this.openWebUIManager.stopFrontend();
    });

    ipcMain.handle('kobold:parseConfigFile', (_, filePath) =>
      this.koboldManager.parseConfigFile(filePath)
    );

    ipcMain.handle('kobold:selectModelFile', (_, title) =>
      this.koboldManager.selectModelFile(title)
    );

    ipcMain.handle('config:get', (_, key) => this.configManager.get(key));

    ipcMain.handle('config:set', (_, key, value) =>
      this.configManager.set(key, value)
    );

    ipcMain.handle('app:getVersion', () => app.getVersion());

    ipcMain.handle('app:getVersionInfo', () => ({
      appVersion: app.getVersion(),
      electronVersion: process.versions.electron,
      nodeVersion: process.versions.node,
      chromeVersion: process.versions.chrome,
      v8Version: process.versions.v8,
      osVersion: os.release(),
      platform: process.platform,
      arch: process.arch,
    }));

    ipcMain.handle('app:showLogsFolder', async () => {
      try {
        const logsDir = this.logManager.getLogsDirectory();
        await shell.openPath(logsDir);
        return { success: true };
      } catch (error) {
        this.logManager.logError('Failed to open logs folder:', error as Error);
        throw new Error(
          `Failed to open logs folder: ${(error as Error).message}`
        );
      }
    });

    ipcMain.handle('app:minimizeWindow', () => {
      const mainWindow = this.windowManager.getMainWindow();
      mainWindow?.minimize();
    });

    ipcMain.handle('app:maximizeWindow', () => {
      const mainWindow = this.windowManager.getMainWindow();
      if (mainWindow?.isMaximized()) {
        mainWindow.restore();
      } else {
        mainWindow?.maximize();
      }
    });

    ipcMain.handle('app:closeWindow', () => {
      const mainWindow = this.windowManager.getMainWindow();
      mainWindow?.close();
    });

    ipcMain.handle('app:getZoomLevel', async () => {
      const mainWindow = this.windowManager.getMainWindow();
      if (mainWindow) {
        return mainWindow.webContents.getZoomLevel();
      }
      return 0;
    });

    ipcMain.handle('app:setZoomLevel', async (_, level: number) => {
      const mainWindow = this.windowManager.getMainWindow();
      if (mainWindow) {
        mainWindow.webContents.setZoomLevel(level);
        await this.configManager.set('zoomLevel', level);
      }
    });

    const mainWindow = this.windowManager.getMainWindow();
    if (mainWindow) {
      mainWindow.webContents.once('did-finish-load', async () => {
        const savedZoomLevel = await this.configManager.get('zoomLevel');
        if (typeof savedZoomLevel === 'number') {
          mainWindow.webContents.setZoomLevel(savedZoomLevel);
        }
      });
    }

    ipcMain.handle('logs:logError', (_, message: string, error?: Error) => {
      this.logManager.logError(message, error);
    });

    ipcMain.handle('sillytavern:isNpxAvailable', () =>
      this.sillyTavernManager.isNpxAvailable()
    );

    ipcMain.handle('openwebui:isUvAvailable', () =>
      this.openWebUIManager.isUvAvailable()
    );
  }
}
