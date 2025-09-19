import { app } from 'electron';
import { platform } from 'process';

import {
  createMainWindow,
  cleanup as cleanupWindow,
} from '@/main/modules/window';
import {
  initialize as initializeConfig,
  getInstallDir,
} from '@/main/modules/config';
import { safeExecute } from '@/utils/node/logger';
import { cleanup } from '@/main/modules/koboldcpp';
import { getSillyTavernManager } from '@/main/modules/sillytavern';
import { cleanup as cleanupOpenWebUI } from '@/main/modules/openwebui';
import { cleanup as cleanupComfyUI } from '@/main/modules/comfyui';
import { setupIPCHandlers } from '@/main/ipc';
import { ensureDir } from '@/utils/node/fs';

export async function initializeApp() {
  const installDir = getInstallDir();

  await app.whenReady();
  await initializeConfig();
  await ensureDir(installDir);

  setupIPCHandlers();

  createMainWindow();

  app.on('window-all-closed', () => {
    if (platform === 'darwin') {
      return;
    }

    app.quit();
  });

  app.on('before-quit', async (event) => {
    event.preventDefault();

    await safeExecute(async () => {
      const cleanupPromises = [
        cleanup(),
        getSillyTavernManager().cleanup(),
        cleanupOpenWebUI(),
        cleanupComfyUI(),
      ];

      const timeoutPromise = new Promise<void>((resolve) => {
        setTimeout(() => {
          resolve();
        }, 10000);
      });

      await Promise.race([Promise.all(cleanupPromises), timeoutPromise]);
    }, 'Error during cleanup');

    cleanupWindow();

    app.exit(0);
  });

  app.on('will-quit', (event) => {
    event.preventDefault();
    app.exit(0);
  });
}
