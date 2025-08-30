import { app } from 'electron';
import { join } from 'path';

import { WindowManager } from '@/main/managers/WindowManager';
import { ConfigManager } from '@/main/managers/ConfigManager';
import { LogManager } from '@/main/managers/LogManager';
import { KoboldCppManager } from '@/main/managers/KoboldCppManager';
import { SillyTavernManager } from '@/main/managers/SillyTavernManager';
import { HardwareService } from '@/main/services/HardwareService';
import { BinaryService } from '@/main/services/BinaryService';
import { IPCHandlers } from '@/main/ipc';
import { PRODUCT_NAME, CONFIG_FILE_NAME } from '@/constants';
import { homedir } from 'os';
import { ensureDir } from '@/utils/fs';

export class GerbilApp {
  private windowManager: WindowManager;
  private koboldManager: KoboldCppManager;
  private configManager: ConfigManager;
  private logManager: LogManager;
  private sillyTavernManager: SillyTavernManager;
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
    this.windowManager = new WindowManager();
    this.hardwareService = new HardwareService(this.logManager);

    this.koboldManager = new KoboldCppManager(
      this.configManager,
      this.windowManager,
      this.logManager
    );

    this.binaryService = new BinaryService(
      this.logManager,
      this.koboldManager,
      this.hardwareService
    );

    this.sillyTavernManager = new SillyTavernManager(
      this.logManager,
      this.windowManager
    );

    this.ipcHandlers = new IPCHandlers(
      this.koboldManager,
      this.configManager,
      this.hardwareService,
      this.binaryService,
      this.logManager,
      this.sillyTavernManager
    );
  }

  private getConfigPath() {
    return join(app.getPath('userData'), CONFIG_FILE_NAME);
  }

  private getDefaultInstallDir(appName: string): string {
    const platform = process.platform;
    const home = homedir();

    switch (platform) {
      case 'win32':
        return join(home, appName);
      case 'darwin':
        return join(home, 'Applications', appName);
      default:
        return join(home, '.local', 'share', appName);
    }
  }

  private async ensureInstallDirectory(): Promise<void> {
    const installDir =
      this.configManager.getInstallDir() ||
      this.getDefaultInstallDir(PRODUCT_NAME);

    if (!this.configManager.getInstallDir()) {
      await this.configManager.setInstallDir(installDir);
    }

    await ensureDir(installDir);
  }

  async initialize(): Promise<void> {
    await app.whenReady();
    await this.configManager.initialize();
    await this.ensureInstallDirectory();

    if (process.platform === 'linux') {
      app.setAppUserModelId('com.gerbil.app');
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
        const cleanupPromises = [
          this.koboldManager.cleanup(),
          this.sillyTavernManager.cleanup(),
        ];

        const timeoutPromise = new Promise<void>((resolve) => {
          setTimeout(() => {
            resolve();
          }, 10000);
        });

        await Promise.race([Promise.all(cleanupPromises), timeoutPromise]);
      } catch (error) {
        this.logManager.logError('Error during cleanup:', error as Error);
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
