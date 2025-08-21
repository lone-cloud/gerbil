import { ipcMain } from 'electron';
import { shell, app } from 'electron';
import { KoboldCppManager } from '@/main/managers/KoboldCppManager';
import { ConfigManager } from '@/main/managers/ConfigManager';
import { LogManager } from '@/main/managers/LogManager';
import { GitHubService } from '@/main/services/GitHubService';
import { HardwareService } from '@/main/services/HardwareService';
import { BinaryService } from '@/main/services/BinaryService';

export class IPCHandlers {
  private koboldManager: KoboldCppManager;
  private configManager: ConfigManager;
  private logManager: LogManager;
  private githubService: GitHubService;
  private hardwareService: HardwareService;
  private binaryService: BinaryService;

  constructor(
    koboldManager: KoboldCppManager,
    configManager: ConfigManager,
    githubService: GitHubService,
    hardwareService: HardwareService,
    binaryService: BinaryService,
    logManager: LogManager
  ) {
    this.koboldManager = koboldManager;
    this.configManager = configManager;
    this.logManager = logManager;
    this.githubService = githubService;
    this.hardwareService = hardwareService;
    this.binaryService = binaryService;
  }

  setupHandlers() {
    ipcMain.handle('kobold:getLatestRelease', () =>
      this.githubService.getLatestRelease()
    );

    ipcMain.handle('kobold:checkForUpdates', async () => {
      const latest = await this.githubService.getRawLatestRelease();
      return latest;
    });

    ipcMain.handle('kobold:downloadRelease', async (_event, asset) => {
      try {
        const mainWindow = this.koboldManager
          .getWindowManager()
          .getMainWindow();

        const filePath = await this.koboldManager.downloadRelease(
          asset,
          (progress: number) => {
            if (mainWindow) {
              mainWindow.webContents.send('download-progress', progress);
            }
          }
        );

        return { success: true, path: filePath };
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    });

    ipcMain.handle('kobold:getInstalledVersions', () =>
      this.koboldManager.getInstalledVersions()
    );

    ipcMain.handle('kobold:getConfigFiles', () =>
      this.koboldManager.getConfigFiles()
    );

    ipcMain.handle(
      'kobold:saveConfigFile',
      async (_event, configName, configData) =>
        this.koboldManager.saveConfigFile(configName, configData)
    );

    ipcMain.handle('kobold:getSelectedConfig', () =>
      this.configManager.getSelectedConfig()
    );

    ipcMain.handle('kobold:setSelectedConfig', (_event, configName) =>
      this.configManager.setSelectedConfig(configName)
    );

    ipcMain.handle('kobold:getCurrentVersion', () =>
      this.koboldManager.getCurrentVersion()
    );

    ipcMain.handle('kobold:getCurrentBinaryInfo', () =>
      this.koboldManager.getCurrentBinaryInfo()
    );

    ipcMain.handle('kobold:setCurrentVersion', (_event, version) =>
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

    ipcMain.handle('kobold:detectROCm', () =>
      this.hardwareService.detectROCm()
    );

    ipcMain.handle('kobold:detectAllCapabilities', () =>
      this.hardwareService.detectAllWithCapabilities()
    );

    ipcMain.handle('kobold:detectBackendSupport', (_, binaryPath: string) =>
      this.binaryService.detectBackendSupport(binaryPath)
    );

    ipcMain.handle('kobold:getAvailableBackends', () =>
      this.binaryService.getAvailableBackends()
    );

    ipcMain.handle('kobold:getPlatform', () => ({
      platform: process.platform,
      arch: process.arch,
    }));

    ipcMain.handle('kobold:getROCmDownload', () =>
      this.koboldManager.getROCmDownload()
    );

    ipcMain.handle('kobold:downloadROCm', async () => {
      try {
        const mainWindow = this.koboldManager
          .getWindowManager()
          .getMainWindow();

        return await this.koboldManager.downloadROCm((progress: number) => {
          if (mainWindow) {
            mainWindow.webContents.send('download-progress', progress);
          }
        });
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    });

    ipcMain.handle('kobold:getInstalledVersion', () =>
      this.koboldManager.getInstalledVersion()
    );

    ipcMain.handle('kobold:getVersionFromBinary', (_event, binaryPath) =>
      this.koboldManager.getVersionFromBinary(binaryPath)
    );

    ipcMain.handle('kobold:getLatestReleaseWithStatus', () =>
      this.koboldManager.getLatestReleaseWithDownloadStatus()
    );

    ipcMain.handle('kobold:launchKoboldCpp', (_event, args) =>
      this.koboldManager.launchKoboldCpp(args)
    );

    ipcMain.handle('kobold:stopKoboldCpp', () =>
      this.koboldManager.stopKoboldCpp()
    );

    ipcMain.handle('kobold:parseConfigFile', (_event, filePath) =>
      this.koboldManager.parseConfigFile(filePath)
    );

    ipcMain.handle('kobold:selectModelFile', () =>
      this.koboldManager.selectModelFile()
    );

    ipcMain.handle('config:get', (_event, key) => this.configManager.get(key));

    ipcMain.handle('config:set', (_event, key, value) =>
      this.configManager.set(key, value)
    );

    ipcMain.handle('app:getVersion', () => app.getVersion());

    ipcMain.handle('app:openExternal', async (_event, url) => {
      try {
        await shell.openExternal(url);
        return { success: true };
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    });

    ipcMain.handle(
      'logs:logError',
      (_event, message: string, error?: Error) => {
        this.logManager.logError(message, error);
      }
    );
  }
}
