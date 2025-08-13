import { ipcMain, dialog } from 'electron';
import { shell, app } from 'electron';
import { KoboldCppManager } from '@/main/managers/KoboldCppManager';
import { ConfigManager } from '@/main/managers/ConfigManager';
import { GitHubService } from '@/main/services/GitHubService';
import { GPUService } from '@/main/services/GPUService';

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

    ipcMain.handle('kobold:checkForUpdates', async () => {
      const latest = await this.githubService.getLatestRelease();
      return latest;
    });

    ipcMain.handle('kobold:openInstallDialog', async () => {
      const result = await dialog.showOpenDialog({
        properties: ['openDirectory'],
        title: 'Select Installation Directory',
      });

      if (!result.canceled && result.filePaths.length > 0) {
        return result.filePaths[0];
      }
      return null;
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

    ipcMain.handle('kobold:launchKoboldCpp', (_event, args, configFilePath) =>
      this.koboldManager.launchKoboldCpp(args, configFilePath)
    );

    ipcMain.handle('kobold:stopKoboldCpp', () =>
      this.koboldManager.stopKoboldCpp()
    );

    ipcMain.handle('kobold:confirmEject', async () => {
      const mainWindow = this.koboldManager.getWindowManager().getMainWindow();
      if (!mainWindow) return false;

      const result = await dialog.showMessageBox(mainWindow, {
        type: 'warning',
        title: 'Confirm Eject',
        message: 'Are you sure you want to stop KoboldCpp?',
        detail:
          'This will terminate the running process and return to the launch screen.',
        buttons: ['Cancel', 'Stop KoboldCpp'],
        defaultId: 0,
        cancelId: 0,
      });

      return result.response === 1; // Returns true if user clicked "Stop KoboldCpp"
    });

    ipcMain.handle('kobold:parseConfigFile', (_event, filePath) =>
      this.koboldManager.parseConfigFile(filePath)
    );

    ipcMain.handle('kobold:selectModelFile', () =>
      this.koboldManager.selectModelFile()
    );

    ipcMain.handle('config:getServerOnly', () =>
      this.configManager.getServerOnly()
    );

    ipcMain.handle('config:setServerOnly', (_event, serverOnly) =>
      this.configManager.setServerOnly(serverOnly)
    );

    ipcMain.handle('config:getModelPath', () =>
      this.configManager.getModelPath()
    );

    ipcMain.handle('config:setModelPath', (_event, path) =>
      this.configManager.setModelPath(path)
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
