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
import { safeExecute } from '@/utils/node/logging';
import { stopKoboldCpp } from '@/main/modules/koboldcpp/launcher';
import { stopFrontend as stopSillyTavern } from '@/main/modules/sillytavern';
import { stopFrontend as stopOpenWebUI } from '@/main/modules/openwebui';
import { stopFrontend as stopComfyUI } from '@/main/modules/comfyui';
import { setupIPCHandlers } from '@/main/ipc';
import { ensureDir } from '@/utils/node/fs';
import { PRODUCT_NAME } from '@/constants';

export async function initializeApp() {
  const installDir = getInstallDir();

  await app.whenReady();
  app.setName(PRODUCT_NAME);
  await initializeConfig();
  await ensureDir(installDir);

  createMainWindow();

  setupIPCHandlers();

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
        cleanupWindow(),
        stopKoboldCpp(),
        stopSillyTavern(),
        stopOpenWebUI(),
        stopComfyUI(),
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
