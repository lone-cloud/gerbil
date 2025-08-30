import { ipcMain, shell, app } from 'electron';
import type { KoboldCppManager } from '@/main/managers/KoboldCppManager';
import type { ConfigManager } from '@/main/managers/ConfigManager';
import type { LogManager } from '@/main/managers/LogManager';
import type { SillyTavernManager } from '@/main/managers/SillyTavernManager';
import { HardwareService } from '@/main/services/HardwareService';
import { BinaryService } from '@/main/services/BinaryService';

export class IPCHandlers {
  private koboldManager: KoboldCppManager;
  private configManager: ConfigManager;
  private logManager: LogManager;
  private sillyTavernManager: SillyTavernManager;
  private hardwareService: HardwareService;
  private binaryService: BinaryService;

  constructor(
    koboldManager: KoboldCppManager,
    configManager: ConfigManager,
    hardwareService: HardwareService,
    binaryService: BinaryService,
    logManager: LogManager,
    sillyTavernManager: SillyTavernManager
  ) {
    this.koboldManager = koboldManager;
    this.configManager = configManager;
    this.logManager = logManager;
    this.sillyTavernManager = sillyTavernManager;
    this.hardwareService = hardwareService;
    this.binaryService = binaryService;
  }

  private async launchKoboldCppWithCustomFrontends(args: string[] = []) {
    try {
      const result = await this.koboldManager.launchKoboldCpp(args);

      const frontendPreference =
        await this.configManager.get('frontendPreference');

      if (frontendPreference === 'sillytavern') {
        this.sillyTavernManager.startFrontend(args);
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
      this.koboldManager.getCurrentInstallDir()
    );

    ipcMain.handle('kobold:selectInstallDirectory', () =>
      this.koboldManager.selectInstallDirectory()
    );

    ipcMain.handle('kobold:detectGPU', () => this.hardwareService.detectGPU());

    ipcMain.handle('kobold:detectCPU', () => this.hardwareService.detectCPU());

    ipcMain.handle('kobold:detectGPUCapabilities', () =>
      this.hardwareService.detectGPUCapabilities()
    );

    ipcMain.handle('kobold:detectGPUMemory', () =>
      this.hardwareService.detectGPUMemory()
    );

    ipcMain.handle('kobold:detectROCm', () =>
      this.hardwareService.detectROCm()
    );

    ipcMain.handle('kobold:detectBackendSupport', () =>
      this.binaryService.detectBackendSupport()
    );

    ipcMain.handle(
      'kobold:getAvailableBackends',
      (_, includeDisabled = false) =>
        this.binaryService.getAvailableBackends(includeDisabled)
    );

    ipcMain.handle('kobold:getPlatform', () => process.platform);

    ipcMain.handle('kobold:launchKoboldCpp', (_, args) =>
      this.launchKoboldCppWithCustomFrontends(args)
    );

    ipcMain.handle('kobold:stopKoboldCpp', () => {
      this.koboldManager.stopKoboldCpp();
      this.sillyTavernManager.stopFrontend();
    });

    ipcMain.handle('kobold:parseConfigFile', (_, filePath) =>
      this.koboldManager.parseConfigFile(filePath)
    );

    ipcMain.handle('kobold:selectModelFile', () =>
      this.koboldManager.selectModelFile()
    );

    ipcMain.handle('config:get', (_, key) => this.configManager.get(key));

    ipcMain.handle('config:set', (_, key, value) =>
      this.configManager.set(key, value)
    );

    ipcMain.handle('app:getVersion', () => app.getVersion());

    ipcMain.handle('app:openExternal', async (_, url) => {
      try {
        await shell.openExternal(url);
        return { success: true };
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    });

    ipcMain.handle('logs:logError', (_, message: string, error?: Error) => {
      this.logManager.logError(message, error);
    });

    ipcMain.handle('sillytavern:isNpxAvailable', () =>
      this.sillyTavernManager.isNpxAvailable()
    );
  }
}
