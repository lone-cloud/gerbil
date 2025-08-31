import { app } from 'electron';
import { join } from 'path';

import { WindowManager } from '@/main/managers/WindowManager';
import { ConfigManager } from '@/main/managers/ConfigManager';
import { LogManager } from '@/main/managers/LogManager';
import { KoboldCppManager } from '@/main/managers/KoboldCppManager';
import { SillyTavernManager } from '@/main/managers/SillyTavernManager';
import { HardwareManager } from '@/main/managers/HardwareManager';
import { BinaryManager } from '@/main/managers/BinaryManager';
import { IPCHandlers } from '@/main/ipc';
import { PRODUCT_NAME } from '@/constants';
import { homedir } from 'os';
import { ensureDir } from '@/utils/fs';
import { getConfigDir } from '@/utils/path';

export class GerbilApp {
  private windowManager: WindowManager;
  private koboldManager: KoboldCppManager;
  private configManager: ConfigManager;
  private logManager: LogManager;
  private sillyTavernManager: SillyTavernManager;
  private hardwareManager: HardwareManager;
  private binaryManager: BinaryManager;
  private ipcHandlers: IPCHandlers;

  constructor() {
    this.logManager = new LogManager();
    this.logManager.setupGlobalErrorHandlers();

    this.configManager = new ConfigManager(getConfigDir(), this.logManager);
    this.windowManager = new WindowManager();
    this.hardwareManager = new HardwareManager(this.logManager);

    this.koboldManager = new KoboldCppManager(
      this.configManager,
      this.windowManager,
      this.logManager
    );

    this.binaryManager = new BinaryManager(
      this.logManager,
      this.koboldManager,
      this.hardwareManager
    );

    this.sillyTavernManager = new SillyTavernManager(
      this.logManager,
      this.windowManager
    );

    this.ipcHandlers = new IPCHandlers(
      this.koboldManager,
      this.configManager,
      this.hardwareManager,
      this.binaryManager,
      this.logManager,
      this.sillyTavernManager,
      this.windowManager
    );
  }

  private getDefaultInstallDir(): string {
    const platform = process.platform;
    const home = homedir();

    switch (platform) {
      case 'win32':
        return join(home, PRODUCT_NAME);
      case 'darwin':
        return join(home, 'Applications', PRODUCT_NAME);
      default:
        return join(home, '.local', 'share', PRODUCT_NAME);
    }
  }

  private async ensureInstallDirectory(): Promise<void> {
    const installDir =
      this.configManager.getInstallDir() || this.getDefaultInstallDir();

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
