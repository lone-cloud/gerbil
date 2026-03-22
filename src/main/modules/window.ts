import { join } from 'node:path';
import { stripVTControlCharacters } from 'node:util';

import type { BrowserWindowConstructorOptions } from 'electron';
import { app, BrowserWindow, clipboard, Menu, nativeTheme, screen, shell } from 'electron';

import { PRODUCT_NAME } from '@/constants';
import type { IPCChannel, IPCChannelPayloads } from '@/types/ipc';
import { isDevelopment } from '@/utils/node/environment';

import type { WindowBounds } from './config';
import {
  getBackgroundColor,
  getEnableSystemTray,
  getWindowBounds,
  set as setConfig,
} from './config';
import { startStaticServer } from './static-server';
import { isTrayActive } from './tray-active';

let mainWindow: BrowserWindow | null = null;

export async function createMainWindow(options?: { startHidden?: boolean }) {
  const { size } = screen.getPrimaryDisplay();
  const savedBounds = getWindowBounds();

  const defaultWidth = 800;
  const minHeight = 600;
  const defaultHeight = Math.max(minHeight, Math.min(Math.floor(size.height * 0.75), 1000));

  const windowOptions = {
    backgroundColor: getBackgroundColor(),
    frame: false,
    height: savedBounds?.height ?? defaultHeight,
    icon: isDevelopment
      ? join(__dirname, '../../src/assets/icon.png')
      : join(__dirname, '../../assets/icon.png'),
    minHeight,
    minWidth: 600,
    show: false,
    title: PRODUCT_NAME,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: join(__dirname, '../preload/index.js'),
      backgroundThrottling: false,
      offscreen: false,
      spellcheck: true,
    },
    width: savedBounds?.width ?? defaultWidth,
  } as BrowserWindowConstructorOptions;

  if (savedBounds?.x !== undefined && savedBounds?.y !== undefined) {
    const minVisibleSize = 100;
    if (
      savedBounds.x >= -minVisibleSize &&
      savedBounds.y >= -minVisibleSize &&
      savedBounds.x < size.width - minVisibleSize &&
      savedBounds.y < size.height - minVisibleSize
    ) {
      windowOptions.x = savedBounds.x;
      windowOptions.y = savedBounds.y;
    } else {
      windowOptions.x = Math.floor((size.width - (savedBounds.width ?? defaultWidth)) / 2);
      windowOptions.y = Math.floor((size.height - (savedBounds.height ?? defaultHeight)) / 2);
    }
  } else {
    windowOptions.x = Math.floor((size.width - defaultWidth) / 2);
    windowOptions.y = Math.floor((size.height - defaultHeight) / 2);
  }

  mainWindow = new BrowserWindow(windowOptions);

  if (savedBounds?.isMaximized) {
    mainWindow.maximize();
  }

  const saveBounds = () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      const isMaximized = mainWindow.isMaximized();
      const currentBounds = mainWindow.getBounds();
      let bounds: WindowBounds = { isMaximized };

      if (!isMaximized) {
        bounds = {
          height: currentBounds.height,
          isMaximized,
          width: currentBounds.width,
          x: currentBounds.x,
          y: currentBounds.y,
        };
      }

      void setConfig('windowBounds', bounds);
    }
  };

  nativeTheme.on('updated', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.setBackgroundColor(getBackgroundColor());
    }
  });

  mainWindow.on('maximize', () => {
    sendToRenderer('window-maximized');
  });
  mainWindow.on('unmaximize', () => {
    sendToRenderer('window-unmaximized');
  });
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
  mainWindow.once('ready-to-show', () => {
    if (!options?.startHidden) {
      mainWindow?.show();
    }
  });

  if (isDevelopment) {
    void mainWindow.loadURL('http://localhost:5173');
  } else {
    const distPath = join(__dirname, '../../dist');
    const url = await startStaticServer(distPath);
    void mainWindow.loadURL(url);
    Menu.setApplicationMenu(null);
  }

  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    const url = new URL(navigationUrl);
    if (
      url.hostname !== 'localhost' &&
      url.hostname !== '127.0.0.1' &&
      !navigationUrl.startsWith('file://')
    ) {
      event.preventDefault();
    }
  });

  mainWindow.webContents.setWindowOpenHandler(() => ({
    action: 'allow',
    overrideBrowserWindowOptions: {
      autoHideMenuBar: true,
      backgroundColor: getBackgroundColor(),
      icon: isDevelopment
        ? join(__dirname, '../../src/assets/icon.png')
        : join(__dirname, '../../assets/icon.png'),
      title: PRODUCT_NAME,
    },
  }));

  mainWindow.on('close', (event) => {
    saveBounds();
    if (getEnableSystemTray() && isTrayActive()) {
      event.preventDefault();
      mainWindow?.hide();
    } else {
      if (mainWindow?.isMinimized()) {
        mainWindow.restore();
      }
      app.quit();
    }
  });

  setupContextMenu(mainWindow);

  return mainWindow;
}

function setupContextMenu(window: BrowserWindow) {
  window.webContents.on('context-menu', (_, params) => {
    const hasLinkURL = Boolean(params.linkURL);
    const hasSelection = Boolean(params.selectionText);
    const { isEditable } = params;
    const isDev = isDevelopment;
    const hasMisspelling = Boolean(params.misspelledWord);

    const canCut = hasSelection && isEditable;
    const canCopy = hasSelection;
    const canPaste = isEditable;
    const canSelectAll = isEditable || params.mediaType === 'none';
    const canUndo = isEditable && params.editFlags?.canUndo;
    const canRedo = isEditable && params.editFlags?.canRedo;
    const hasEditOperations = canCut || canCopy || canPaste || canSelectAll || canUndo || canRedo;

    const menuItems = [];

    if (isDev) {
      menuItems.push({
        click: () => {
          window.webContents.inspectElement(params.x, params.y);
        },
        label: 'Inspect Element',
      });
    }

    if (hasMisspelling && params.dictionarySuggestions.length > 0) {
      if (isDev) {
        menuItems.push({ type: 'separator' as const });
      }

      params.dictionarySuggestions.forEach((suggestion) => {
        menuItems.push({
          click: () => {
            window.webContents.replaceMisspelling(suggestion);
          },
          label: suggestion,
        });
      });

      menuItems.push({ type: 'separator' as const });
      menuItems.push({
        click: () => {
          window.webContents.session.addWordToSpellCheckerDictionary(params.misspelledWord);
        },
        label: 'Add to Dictionary',
      });

      if (hasEditOperations) {
        menuItems.push({ type: 'separator' as const });
      }
    }

    if (hasEditOperations) {
      if (isDev && !hasMisspelling) {
        menuItems.push({ type: 'separator' as const });
      }

      if (canUndo) {
        menuItems.push({ label: 'Undo', role: 'undo' as const });
      }
      if (canRedo) {
        menuItems.push({ label: 'Redo', role: 'redo' as const });
      }

      if ((canUndo || canRedo) && (canCut || canCopy || canPaste || canSelectAll)) {
        menuItems.push({ type: 'separator' as const });
      }

      if (canCut) {
        menuItems.push({ label: 'Cut', role: 'cut' as const });
      }
      if (canCopy) {
        menuItems.push({ label: 'Copy', role: 'copy' as const });
      }
      if (canPaste) {
        menuItems.push({ label: 'Paste', role: 'paste' as const });
      }

      if ((canCut || canCopy || canPaste) && canSelectAll) {
        menuItems.push({ type: 'separator' as const });
      }

      if (canSelectAll) {
        menuItems.push({ label: 'Select All', role: 'selectAll' as const });
      }
    }

    if (hasLinkURL) {
      if (isDev || hasEditOperations) {
        menuItems.push({ type: 'separator' as const });
      }

      menuItems.push({
        click: () => {
          if (params.linkURL) {
            void shell.openExternal(params.linkURL);
          }
        },
        label: 'Open Link in Browser',
      });

      menuItems.push({
        click: () => {
          if (params.linkURL) {
            clipboard.writeText(params.linkURL);
          }
        },
        label: 'Copy Link Address',
      });
    }

    if (menuItems.length > 0) {
      const menu = Menu.buildFromTemplate(menuItems);
      menu.popup({ window });
    }
  });
}

export function getMainWindow() {
  if (!mainWindow) {
    throw new Error('Main window not initialized');
  }

  return mainWindow;
}

export const sendToRenderer = <T extends IPCChannel>(
  channel: T,
  ...args: IPCChannelPayloads[T]
) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, ...args);
  }
};

export function sendKoboldOutput(message: string, raw?: boolean) {
  const cleanMessage = stripVTControlCharacters(message);
  sendToRenderer('kobold-output', raw ? cleanMessage : `${cleanMessage}\n`);
}

export const cleanup = () => getMainWindow().removeAllListeners();
