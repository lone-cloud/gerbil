import { app } from 'electron';

import { getWindowManager } from '@/main/managers/WindowManager';
import { getConfigManager } from '@/main/managers/ConfigManager';
import { getLogManager } from '@/main/managers/LogManager';
import { getKoboldCppManager } from '@/main/managers/KoboldCppManager';
import { getSillyTavernManager } from '@/main/managers/SillyTavernManager';
import { getOpenWebUIManager } from '@/main/managers/OpenWebUIManager';
import { getHardwareManager } from '@/main/managers/HardwareManager';
import { getBinaryManager } from '@/main/managers/BinaryManager';
import { IPCHandlers } from '@/main/ipc';
import { ensureDir } from '@/utils/fs';
import { getConfigDir } from '@/utils/path';

export class GerbilApp {
  private ipcHandlers: IPCHandlers;

  constructor() {
    this.ipcHandlers = new IPCHandlers(
      getKoboldCppManager(),
      getConfigManager(getConfigDir()),
      getHardwareManager(),
      getBinaryManager(),
      getLogManager(),
      getSillyTavernManager(),
      getOpenWebUIManager(),
      getWindowManager()
    );
  }

  private async ensureInstallDirectory(): Promise<void> {
    const installDir = getConfigManager().getInstallDir();
    await ensureDir(installDir);
  }

  async initialize(): Promise<void> {
    await app.whenReady();
    await getConfigManager().initialize();
    await this.ensureInstallDirectory();

    getWindowManager().createMainWindow();
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
          getKoboldCppManager().cleanup(),
          getSillyTavernManager().cleanup(),
          getOpenWebUIManager().cleanup(),
        ];

        const timeoutPromise = new Promise<void>((resolve) => {
          setTimeout(() => {
            resolve();
          }, 10000);
        });

        await Promise.race([Promise.all(cleanupPromises), timeoutPromise]);
      } catch (error) {
        getLogManager().logError('Error during cleanup:', error as Error);
      }

      getWindowManager().cleanup();

      app.exit(0);
    });

    app.on('will-quit', async (event) => {
      event.preventDefault();
      app.exit(0);
    });

    app.on('activate', () => {
      if (!getWindowManager().getMainWindow()) {
        getWindowManager().createMainWindow();
      }
    });
  }
}
