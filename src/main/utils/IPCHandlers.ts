import { ipcMain } from 'electron';
import { shell, app } from 'electron';
import { KoboldCppManager } from '../managers/KoboldCppManager';
import { ConfigManager } from '../managers/ConfigManager';
import { GitHubService } from '../services/GitHubService';
import { GPUService } from '../services/GPUService';

export class IPCHandlers {
  private koboldManager: KoboldCppManager;
  private configManager: ConfigManager;
  private githubService: GitHubService;
  private gpuService: GPUService;

  constructor(
    koboldManager: KoboldCppManager,
    configManager: ConfigManager,
    githubService: GitHubService,
    gpuService: GPUService
  ) {
    this.koboldManager = koboldManager;
    this.configManager = configManager;
    this.githubService = githubService;
    this.gpuService = gpuService;
  }

  setupHandlers() {
    ipcMain.handle('kobold:getLatestRelease', () =>
      this.githubService.getLatestRelease()
    );

    ipcMain.handle('kobold:getAllReleases', () =>
      this.githubService.getAllReleases()
    );

    ipcMain.handle(
      'kobold:downloadRelease',
      async (_event, asset, onProgress) =>
        this.koboldManager.downloadRelease(asset, onProgress)
    );

    ipcMain.handle('kobold:getInstalledVersions', () =>
      this.koboldManager.getInstalledVersions()
    );

    ipcMain.handle('kobold:isInstalled', () =>
      this.koboldManager.isInstalled()
    );

    ipcMain.handle('kobold:getConfigFiles', () =>
      this.koboldManager.getConfigFiles()
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

    ipcMain.handle('kobold:setCurrentVersion', (_event, version) =>
      this.koboldManager.setCurrentVersion(version)
    );

    ipcMain.handle('kobold:getCurrentInstallDir', () =>
      this.koboldManager.getCurrentInstallDir()
    );

    ipcMain.handle('kobold:selectInstallDirectory', () =>
      this.koboldManager.selectInstallDirectory()
    );

    ipcMain.handle(
      'kobold:addInstalledVersion',
      (_event, version, path, type) =>
        this.koboldManager.addInstalledVersion(version, path, type)
    );

    ipcMain.handle('kobold:detectGPU', () => this.gpuService.detectGPU());

    ipcMain.handle('kobold:getPlatform', () => ({
      platform: process.platform,
      arch: process.arch,
    }));

    ipcMain.handle('kobold:getROCmDownload', () =>
      this.koboldManager.getROCmDownload()
    );

    ipcMain.handle('kobold:downloadROCm', async () => {
      try {
        return await this.koboldManager.downloadROCm();
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    });

    ipcMain.handle('kobold:launchKobold', (_event, versionPath, args) =>
      this.koboldManager.launchKobold(versionPath, args)
    );

    ipcMain.handle('kobold:stopKobold', () => this.koboldManager.stopKobold());

    ipcMain.handle('kobold:isRunning', () => this.koboldManager.isRunning());

    ipcMain.handle('kobold:getInstalledVersion', () =>
      this.koboldManager.getInstalledVersion()
    );

    ipcMain.handle('kobold:getVersionFromBinary', (_event, binaryPath) =>
      this.koboldManager.getVersionFromBinary(binaryPath)
    );

    ipcMain.handle('kobold:checkForUpdates', () =>
      this.koboldManager.checkForUpdates()
    );

    ipcMain.handle('kobold:getLatestReleaseWithStatus', () =>
      this.koboldManager.getLatestReleaseWithDownloadStatus()
    );

    ipcMain.handle('kobold:launchKoboldCpp', (_event, args) =>
      this.koboldManager.launchKoboldCpp(args)
    );

    ipcMain.handle('kobold:openInstallDialog', () =>
      this.koboldManager.openInstallDialog()
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
  }
}
