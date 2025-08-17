import { ipcMain, dialog } from 'electron';
import { shell, app } from 'electron';
import { spawn } from 'child_process';
import { join } from 'path';
import { existsSync, readFileSync, writeFileSync, unlinkSync } from 'fs';
import { KoboldCppManager } from '@/main/managers/KoboldCppManager';
import { ConfigManager } from '@/main/managers/ConfigManager';
import { LogManager } from '@/main/managers/LogManager';
import { GitHubService } from '@/main/services/GitHubService';
import { HardwareService } from '@/main/services/HardwareService';
import { BinaryService } from '@/main/services/BinaryService';
import type { GPUCapabilities } from '@/types/hardware';

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

    ipcMain.handle('kobold:detectHardware', () =>
      this.hardwareService.detectAll()
    );

    ipcMain.handle('kobold:detectAllCapabilities', () =>
      this.hardwareService.detectAllWithCapabilities()
    );

    ipcMain.handle('kobold:detectBackendSupport', (_, binaryPath: string) =>
      this.binaryService.detectBackendSupport(binaryPath)
    );

    ipcMain.handle(
      'kobold:getAvailableBackends',
      (_, binaryPath: string, hardwareCapabilities: GPUCapabilities) =>
        this.binaryService.getAvailableBackends(
          binaryPath,
          hardwareCapabilities
        )
    );

    ipcMain.handle('kobold:clearBinaryCache', () =>
      this.binaryService.clearCache()
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
        message: 'Are you sure you want to eject?',
        detail:
          'This will terminate the running process and return to the launch screen.',
        buttons: ['Cancel', 'Eject'],
        defaultId: 0,
        cancelId: 0,
      });

      return result.response === 1;
    });

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

    ipcMain.handle('system:installIcon', async () => {
      try {
        if (process.platform !== 'linux') {
          return {
            success: false,
            error: 'Icon installation is only available on Linux',
          };
        }

        const iconSource = join(process.cwd(), 'assets/icon.png');
        const desktopSource = join(
          process.cwd(),
          'assets/friendly-kobold.desktop'
        );

        const iconDest = '/usr/share/pixmaps/friendly-kobold.png';
        const desktopDest = '/usr/share/applications/friendly-kobold.desktop';

        let execPath: string;
        if (process.env.APPIMAGE) {
          execPath = process.env.APPIMAGE;
        } else {
          const appImagePath = join(
            process.cwd(),
            'release',
            'Friendly Kobold-0.1.0.AppImage'
          );
          if (existsSync(appImagePath)) {
            execPath = appImagePath;
          } else {
            return {
              success: false,
              error:
                'Could not find AppImage executable. Please build the application first.',
            };
          }
        }

        const tempDesktopPath = join(
          require('os').tmpdir(),
          'friendly-kobold.desktop'
        );
        const desktopContent = readFileSync(desktopSource, 'utf8');
        const updatedDesktopContent = desktopContent.replace(
          /^Exec=.*$/m,
          `Exec="${execPath}" %U`
        );
        writeFileSync(tempDesktopPath, updatedDesktopContent);

        const commands = [
          ['pkexec', 'cp', iconSource, iconDest],
          ['pkexec', 'cp', tempDesktopPath, desktopDest],
          ['update-desktop-database', '/usr/share/applications/'],
        ];

        for (const command of commands) {
          try {
            await new Promise<void>((resolve, reject) => {
              const childProcess = spawn(command[0], command.slice(1), {
                stdio: ['ignore', 'pipe', 'pipe'],
              });

              childProcess.on('close', (code) => {
                if (code === 0) {
                  resolve();
                } else {
                  reject(new Error(`Command failed with exit code ${code}`));
                }
              });

              childProcess.on('error', (err) => {
                reject(err);
              });
            });
          } catch (error) {
            this.logManager.logError(
              `Icon installation command failed: ${command.join(' ')}`,
              error as Error
            );
            if (command[0] === 'pkexec') {
              try {
                unlinkSync(tempDesktopPath);
              } catch {
                void 0;
              }
              return {
                success: false,
                error:
                  'Permission denied. Please ensure you have admin privileges.',
              };
            }
          }
        }

        try {
          unlinkSync(tempDesktopPath);
        } catch {
          void 0;
        }

        return { success: true };
      } catch (error) {
        this.logManager.logError(
          'Failed to install system icon:',
          error as Error
        );
        return { success: false, error: (error as Error).message };
      }
    });
  }
}
