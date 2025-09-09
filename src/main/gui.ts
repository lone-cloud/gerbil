import { app } from 'electron';

import {
  createMainWindow,
  cleanup as cleanupWindow,
} from '@/main/modules/window';
import {
  initialize as initializeConfig,
  getInstallDir,
} from '@/main/modules/config';
import { logError } from '@/main/modules/logging';
import { cleanup } from '@/main/modules/koboldcpp';
import { getSillyTavernManager } from '@/main/modules/sillytavern';
import { cleanup as cleanupOpenWebUI } from '@/main/modules/openwebui';
import { setupIPCHandlers } from '@/main/ipc';
import { ensureDir } from '@/utils/fs';

export async function initializeApp(): Promise<void> {
  const installDir = getInstallDir();

  await app.whenReady();
  await initializeConfig();
  await ensureDir(installDir);

  setupIPCHandlers();

  createMainWindow();

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
        cleanup(),
        getSillyTavernManager().cleanup(),
        cleanupOpenWebUI(),
      ];

      const timeoutPromise = new Promise<void>((resolve) => {
        setTimeout(() => {
          resolve();
        }, 10000);
      });

      await Promise.race([Promise.all(cleanupPromises), timeoutPromise]);
    } catch (error) {
      logError('Error during cleanup:', error as Error);
    }

    cleanupWindow();

    app.exit(0);
  });

  app.on('will-quit', async (event) => {
    event.preventDefault();
    app.exit(0);
  });
}
