import { platform } from 'node:process';
import { app } from 'electron';
import { PRODUCT_NAME } from '@/constants';
import { setupIPCHandlers } from '@/main/ipc';
import {
  getEnableSystemTray,
  getInstallDir,
  getStartMinimizedToTray,
  initialize as initializeConfig,
} from '@/main/modules/config';
import { stopKoboldCpp } from '@/main/modules/koboldcpp/launcher';
import { stopFrontend as stopOpenWebUI } from '@/main/modules/openwebui';
import { stopFrontend as stopSillyTavern } from '@/main/modules/sillytavern';
import { stopStaticServer } from '@/main/modules/static-server';
import { createTray } from '@/main/modules/tray';
import { cleanup as cleanupWindow, createMainWindow, getMainWindow } from '@/main/modules/window';
import { ensureDir } from '@/utils/node/fs';
import { safeExecute } from '@/utils/node/logging';

export async function initializeApp(options?: { startMinimized?: boolean }) {
  const gotTheLock = app.requestSingleInstanceLock();

  if (!gotTheLock) {
    app.quit();
    return;
  }

  app.on('second-instance', () => {
    const mainWindow = getMainWindow();

    if (!mainWindow.isVisible()) {
      mainWindow.show();
    }

    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }

    mainWindow.focus();
  });

  const installDir = getInstallDir();

  await app.whenReady();
  app.setName(PRODUCT_NAME);
  await initializeConfig();
  await ensureDir(installDir);

  const startMinimized = options?.startMinimized ?? getStartMinimizedToTray();
  const trayEnabled = getEnableSystemTray();

  await createMainWindow({ startHidden: startMinimized && trayEnabled });
  createTray();

  setupIPCHandlers();

  app.on('window-all-closed', () => {
    if (platform === 'darwin') {
      return;
    }

    app.quit();
  });

  app.on('before-quit', (event) => {
    event.preventDefault();

    void safeExecute(async () => {
      const cleanupPromises = [
        Promise.resolve(cleanupWindow()),
        stopKoboldCpp(),
        stopSillyTavern(),
        stopOpenWebUI(),
        stopStaticServer(),
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
