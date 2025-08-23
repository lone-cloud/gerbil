import { app } from 'electron';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { homedir } from 'os';

import { WindowManager } from '@/main/managers/WindowManager';
import { ConfigManager } from '@/main/managers/ConfigManager';
import { LogManager } from '@/main/managers/LogManager';
import { KoboldCppManager } from '@/main/managers/KoboldCppManager';
import { GitHubService } from '@/main/services/GitHubService';
import { HardwareService } from '@/main/services/HardwareService';
import { BinaryService } from '@/main/services/BinaryService';
import { IPCHandlers } from '@/main/utils/IPCHandlers';
import { APP_NAME, CONFIG_FILE_NAME } from '@/constants';

class FriendlyKoboldApp {
  private windowManager: WindowManager;
  private configManager: ConfigManager;
  private logManager: LogManager;
  private koboldManager: KoboldCppManager;
  private githubService: GitHubService;
  private hardwareService: HardwareService;
  private binaryService: BinaryService;
  private ipcHandlers: IPCHandlers;

  constructor() {
    this.logManager = new LogManager();
    this.logManager.setupGlobalErrorHandlers();

    this.configManager = new ConfigManager(
      this.getConfigPath(),
      this.logManager
    );
    this.ensureInstallDirectory();
    this.windowManager = new WindowManager();
    this.githubService = new GitHubService(this.logManager);
    this.hardwareService = new HardwareService(this.logManager);

    this.koboldManager = new KoboldCppManager(
      this.configManager,
      this.githubService,
      this.windowManager,
      this.logManager
    );

    this.binaryService = new BinaryService(
      this.logManager,
      this.koboldManager,
      this.hardwareService
    );

    this.ipcHandlers = new IPCHandlers(
      this.koboldManager,
      this.configManager,
      this.githubService,
      this.hardwareService,
      this.binaryService,
      this.logManager
    );
  }

  private getConfigPath() {
    return join(app.getPath('userData'), CONFIG_FILE_NAME);
  }

  private getDefaultInstallPath() {
    const platform = process.platform;
    const home = homedir();

    switch (platform) {
      case 'win32':
        return join(home, APP_NAME);
      case 'darwin':
        return join(home, 'Applications', APP_NAME);
      default:
        return join(home, '.local', 'share', APP_NAME);
    }
  }

  private ensureInstallDirectory() {
    const installDir =
      this.configManager.getInstallDir() || this.getDefaultInstallPath();

    if (!this.configManager.getInstallDir()) {
      this.configManager.setInstallDir(installDir);
    }

    if (!existsSync(installDir)) {
      mkdirSync(installDir, { recursive: true });
    }
  }

  async initialize(): Promise<void> {
    await app.whenReady();

    if (process.platform === 'linux') {
      app.setAppUserModelId('com.friendly-kobold.app');
    }

    this.windowManager.setupApplicationMenu();
    this.windowManager.createMainWindow();
    this.ipcHandlers.setupHandlers();

    app.on('window-all-closed', () => {
      if (process.platform === 'darwin') {
        return;
      }

      app.quit();
    });

    app.on('before-quit', async (event) => {
      event.preventDefault();

      try {
        const cleanupPromise = this.koboldManager.cleanup();
        const timeoutPromise = new Promise<void>((resolve) => {
          setTimeout(() => {
            resolve();
          }, 10000);
        });

        await Promise.race([cleanupPromise, timeoutPromise]);
      } catch (error) {
        this.logManager.logError(
          'Error during KoboldCpp cleanup:',
          error as Error
        );
      }

      this.windowManager.cleanup();

      app.exit(0);
    });

    app.on('will-quit', async (event) => {
      event.preventDefault();
      app.exit(0);
    });

    app.on('activate', () => {
      if (!this.windowManager.getMainWindow()) {
        this.windowManager.createMainWindow();
      }
    });
  }
}

const friendlyKoboldApp = new FriendlyKoboldApp();
friendlyKoboldApp.initialize().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('Failed to initialize FriendlyKobold:', error);
});
