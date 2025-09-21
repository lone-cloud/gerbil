import { BrowserWindow, app, shell, screen, Menu, clipboard } from 'electron';
import type { BrowserWindowConstructorOptions } from 'electron';
import { join } from 'path';
import { stripVTControlCharacters } from 'util';
import { PRODUCT_NAME } from '../../constants';
import type { IPCChannel, IPCChannelPayloads } from '@/types/ipc';
import { isDevelopment } from '@/utils/node/environment';
import { getBackgroundColor, getWindowBounds, setWindowBounds } from './config';

let mainWindow: BrowserWindow | null = null;

export function createMainWindow() {
  const { size } = screen.getPrimaryDisplay();
  const savedBounds = getWindowBounds();

  const defaultWidth = 800;
  const defaultHeight = Math.min(Math.floor(size.height * 0.75), 1000);

  const windowOptions = {
    minWidth: 600,
    minHeight: 600,
    width: savedBounds?.width || defaultWidth,
    height: savedBounds?.height || defaultHeight,
    frame: false,
    title: PRODUCT_NAME,
    show: false,
    backgroundColor: getBackgroundColor(),
    icon: isDevelopment
      ? join(__dirname, '../../src/assets/icon.png')
      : join(__dirname, '../../assets/icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: join(__dirname, '../preload/index.js'),
      backgroundThrottling: false,
      offscreen: false,
      spellcheck: false,
    },
  } as BrowserWindowConstructorOptions;

  if (savedBounds) {
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
      windowOptions.x = Math.floor(
        (size.width - (savedBounds.width || defaultWidth)) / 2
      );
      windowOptions.y = Math.floor(
        (size.height - (savedBounds.height || defaultHeight)) / 2
      );
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
    if (mainWindow) {
      const bounds = mainWindow.getBounds();
      const isMaximized = mainWindow.isMaximized();

      setWindowBounds({
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
        isMaximized,
      });
    }
  };

  mainWindow.on('moved', saveBounds);
  mainWindow.on('resized', saveBounds);
  mainWindow.on('maximize', () => {
    saveBounds();
    sendToRenderer('window-maximized');
  });
  mainWindow.on('unmaximize', () => {
    saveBounds();
    sendToRenderer('window-unmaximized');
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  if (isDevelopment) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(join(__dirname, '../../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  if (!isDevelopment) {
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
      icon: isDevelopment
        ? join(__dirname, '../../src/assets/icon.png')
        : join(__dirname, '../../assets/icon.png'),
      title: PRODUCT_NAME,
      backgroundColor: getBackgroundColor(),
    },
  }));

  mainWindow.on('close', () => {
    app.quit();
  });

  setupContextMenu(mainWindow);

  return mainWindow;
}

function setupContextMenu(mainWindow: BrowserWindow) {
  // eslint-disable-next-line sonarjs/cognitive-complexity
  mainWindow.webContents.on('context-menu', (_, params) => {
    const hasLinkURL = !!params.linkURL;
    const hasSelection = !!params.selectionText;
    const isEditable = params.isEditable;
    const isDev = isDevelopment;

    const canCut = hasSelection && isEditable;
    const canCopy = hasSelection;
    const canPaste = isEditable;
    const canSelectAll = isEditable || params.mediaType === 'none';
    const canUndo = isEditable && params.editFlags?.canUndo;
    const canRedo = isEditable && params.editFlags?.canRedo;
    const hasEditOperations =
      canCut || canCopy || canPaste || canSelectAll || canUndo || canRedo;

    const menuItems = [];

    if (isDev) {
      menuItems.push({
        label: 'Inspect Element',
        click: () => {
          mainWindow.webContents.inspectElement(params.x, params.y);
        },
      });
    }

    if (hasEditOperations) {
      if (isDev) {
        menuItems.push({ type: 'separator' as const });
      }

      if (canUndo) {
        menuItems.push({ label: 'Undo', role: 'undo' as const });
      }
      if (canRedo) {
        menuItems.push({ label: 'Redo', role: 'redo' as const });
      }

      if (
        (canUndo || canRedo) &&
        (canCut || canCopy || canPaste || canSelectAll)
      ) {
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
        label: 'Open Link in Browser',
        click: () => {
          if (params.linkURL) {
            shell.openExternal(params.linkURL);
          }
        },
      });

      menuItems.push({
        label: 'Copy Link Address',
        click: () => {
          if (params.linkURL) {
            clipboard.writeText(params.linkURL);
          }
        },
      });
    }

    if (menuItems.length > 0) {
      const menu = Menu.buildFromTemplate(menuItems);
      menu.popup({ window: mainWindow! });
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
) => getMainWindow().webContents.send(channel, ...args);

export function sendKoboldOutput(message: string, raw?: boolean) {
  const cleanMessage = stripVTControlCharacters(message);
  sendToRenderer('kobold-output', raw ? cleanMessage : `${cleanMessage}\n`);
}

export const cleanup = () => getMainWindow().removeAllListeners();
