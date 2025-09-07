import {
  BrowserWindow,
  app,
  shell,
  nativeImage,
  screen,
  Menu,
  clipboard,
} from 'electron';
import { join } from 'path';
import { stripVTControlCharacters } from 'util';
import { PRODUCT_NAME } from '../../constants';
import type { IPCChannel, IPCChannelPayloads } from '@/types/ipc';

export class WindowManager {
  private mainWindow: BrowserWindow | null = null;

  private isDevelopment(): boolean {
    return process.env.NODE_ENV === 'development' || !app.isPackaged;
  }

  private getIconPath(): string {
    if (process.env.NODE_ENV === 'development') {
      const projectRoot = join(__dirname, '../..');
      return join(projectRoot, 'src/assets/icon.png');
    }
    return join(process.resourcesPath, 'assets/icon.png');
  }

  createMainWindow(): BrowserWindow {
    const iconPath = this.getIconPath();
    const iconImage = nativeImage.createFromPath(iconPath);

    const { workAreaSize } = screen.getPrimaryDisplay();
    const windowHeight = Math.floor(workAreaSize.height * 0.86);

    this.mainWindow = new BrowserWindow({
      width: 1000,
      height: windowHeight,
      frame: false,
      icon: iconImage,
      title: PRODUCT_NAME,
      show: false,
      backgroundColor: '#ffffff',
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: join(__dirname, '../preload/index.js'),
        backgroundThrottling: false,
        offscreen: false,
        spellcheck: false,
      },
    });

    if (process.platform === 'linux') {
      this.mainWindow.setIcon(iconImage);
    }

    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow?.show();
    });

    if (process.env.VITE_DEV_SERVER_URL) {
      this.mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    } else if (process.env.NODE_ENV === 'development') {
      this.mainWindow.loadURL('http://localhost:5173');
    } else {
      this.mainWindow.loadFile(join(__dirname, '../../dist/index.html'));
    }

    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });

    if (!this.isDevelopment()) {
      Menu.setApplicationMenu(null);
    }

    this.mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
      const url = new URL(navigationUrl);
      if (
        url.hostname !== 'localhost' &&
        url.hostname !== '127.0.0.1' &&
        !navigationUrl.startsWith('file://')
      ) {
        event.preventDefault();
      }
    });

    this.mainWindow.webContents.setWindowOpenHandler(() => ({
      action: 'allow',
    }));

    this.mainWindow.on('close', () => {
      app.quit();
    });

    this.setupContextMenu();

    return this.mainWindow;
  }

  private setupContextMenu() {
    if (!this.mainWindow) return;

    // eslint-disable-next-line sonarjs/cognitive-complexity
    this.mainWindow.webContents.on('context-menu', (_, params) => {
      const hasLinkURL = !!params.linkURL;
      const hasSelection = !!params.selectionText;
      const isEditable = params.isEditable;
      const isDev = this.isDevelopment();

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
            this.mainWindow?.webContents.inspectElement(params.x, params.y);
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
        menu.popup({ window: this.mainWindow! });
      }
    });
  }

  getMainWindow(): BrowserWindow | null {
    return this.mainWindow;
  }

  sendToRenderer<T extends IPCChannel>(
    channel: T,
    ...args: IPCChannelPayloads[T]
  ): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(channel, ...args);
    }
  }

  sendKoboldOutput(message: string, raw?: boolean): void {
    const cleanMessage = stripVTControlCharacters(message);
    this.sendToRenderer(
      'kobold-output',
      raw ? cleanMessage : `${cleanMessage}\n`
    );
  }

  public cleanup() {
    if (this.mainWindow) {
      this.mainWindow.removeAllListeners();
    }
  }
}
