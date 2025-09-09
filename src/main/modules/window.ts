import { BrowserWindow, app, shell, screen, Menu, clipboard } from 'electron';
import { join } from 'path';
import { stripVTControlCharacters } from 'util';
import { PRODUCT_NAME } from '../../constants';
import type { IPCChannel, IPCChannelPayloads } from '@/types/ipc';
import { isDevelopment } from '@/utils/environment';
import { getBackgroundColor } from './config';

let mainWindow: BrowserWindow | null = null;

export function createMainWindow() {
  const { size } = screen.getPrimaryDisplay();
  const windowHeight = Math.floor(size.height * 0.86);
  const windowWidth = 800;

  const icon = isDevelopment
    ? join(__dirname, '../../src/assets/icon.png')
    : join(__dirname, '../../assets/icon.png');

  mainWindow = new BrowserWindow({
    width: windowWidth,
    height: windowHeight,
    x: Math.floor((size.width - windowWidth) / 2),
    y: Math.floor((size.height - windowHeight) / 2),
    frame: false,
    title: PRODUCT_NAME,
    show: false,
    backgroundColor: getBackgroundColor(),
    icon,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: join(__dirname, '../preload/index.js'),
      backgroundThrottling: false,
      offscreen: false,
      spellcheck: false,
    },
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
      icon,
      title: PRODUCT_NAME,
      backgroundColor: getBackgroundColor(),
    },
  }));

  mainWindow.on('close', () => {
    app.quit();
  });

  setupContextMenu();

  return mainWindow;
}

function setupContextMenu() {
  if (!mainWindow) return;

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
          mainWindow?.webContents.inspectElement(params.x, params.y);
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
  return mainWindow;
}

export function sendToRenderer<T extends IPCChannel>(
  channel: T,
  ...args: IPCChannelPayloads[T]
): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, ...args);
  }
}

export function sendKoboldOutput(message: string, raw?: boolean) {
  const cleanMessage = stripVTControlCharacters(message);
  sendToRenderer('kobold-output', raw ? cleanMessage : `${cleanMessage}\n`);
}

export function cleanup() {
  if (mainWindow) {
    mainWindow.removeAllListeners();
  }
}
