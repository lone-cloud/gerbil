import {
  BrowserWindow,
  app,
  Menu,
  shell,
  Tray,
  nativeImage,
  dialog,
  clipboard,
} from 'electron';
import * as os from 'os';
import { join } from 'path';
import { ConfigManager } from './ConfigManager';

export class WindowManager {
  private mainWindow: BrowserWindow | null = null;
  private tray: Tray | null = null;
  private isQuitting = false;
  private configManager: ConfigManager;

  constructor(configManager: ConfigManager) {
    this.configManager = configManager;
  }

  createMainWindow(): BrowserWindow {
    this.mainWindow = new BrowserWindow({
      width: 1000,
      height: 600,
      icon: join(app.getAppPath(), 'assets', 'icon.png'),
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: join(__dirname, '../preload/index.js'),
      },
    });

    if (process.env.VITE_DEV_SERVER_URL) {
      this.mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    } else if (process.env.NODE_ENV === 'development') {
      this.mainWindow.loadURL('http://localhost:5173');
    } else {
      this.mainWindow.loadFile(join(__dirname, '../dist/index.html'));
    }

    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });

    // Allow navigation to localhost URLs for iframe content
    this.mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
      const url = new URL(navigationUrl);
      // Only allow navigation to localhost or the app's origin
      if (
        url.hostname !== 'localhost' &&
        url.hostname !== '127.0.0.1' &&
        !navigationUrl.startsWith('file://')
      ) {
        event.preventDefault();
      }
    });

    // Handle iframe navigation permissions
    this.mainWindow.webContents.setWindowOpenHandler(({ url }) => {
      const parsedUrl = new URL(url);
      // Allow localhost URLs to open in the same window/iframe
      if (
        parsedUrl.hostname === 'localhost' ||
        parsedUrl.hostname === '127.0.0.1'
      ) {
        return { action: 'allow' };
      }
      // For other URLs, open in external browser
      shell.openExternal(url);
      return { action: 'deny' };
    });

    this.mainWindow.on('close', async (event) => {
      if (!this.isQuitting) {
        const minimizeToTray =
          this.configManager.get('minimizeToTray') === true;

        if (minimizeToTray) {
          event.preventDefault();
          this.mainWindow?.hide();

          if (!this.tray) {
            this.createSystemTray();
          }
        }
      }
    });

    this.mainWindow.on('minimize', () => {
      const minimizeToTray = this.configManager.get('minimizeToTray') === true;

      if (minimizeToTray) {
        this.mainWindow?.hide();

        if (!this.tray) {
          this.createSystemTray();
        }
      }
    });

    this.setupContextMenu();
    return this.mainWindow;
  }

  getMainWindow(): BrowserWindow | null {
    return this.mainWindow;
  }

  private createSystemTray() {
    const iconPath = join(app.getAppPath(), 'assets', 'icon.png');
    this.tray = new Tray(nativeImage.createFromPath(iconPath));

    this.tray.setToolTip('Friendly Kobold');

    const trayMenu = Menu.buildFromTemplate([
      {
        label: 'Show',
        click: () => {
          this.mainWindow?.show();
        },
      },
      { type: 'separator' },
      {
        label: 'Quit',
        click: () => {
          this.isQuitting = true;
          app.quit();
        },
      },
    ]);

    this.tray.setContextMenu(trayMenu);

    this.tray.on('click', () => {
      this.mainWindow?.show();
    });

    this.tray.on('double-click', () => {
      if (this.mainWindow?.isVisible()) {
        this.mainWindow.hide();
      } else {
        this.mainWindow?.show();
      }
    });
  }

  public cleanup() {
    if (this.tray) {
      this.tray.removeAllListeners();
      this.tray.destroy();
      this.tray = null;
    }

    if (this.mainWindow) {
      this.mainWindow.removeAllListeners();
    }
  }

  private setupContextMenu() {
    if (!this.mainWindow) return;

    this.mainWindow.webContents.on('context-menu', (_event, params) => {
      const hasLinkURL = !!params.linkURL;

      const menu = Menu.buildFromTemplate([
        {
          label: 'Inspect Element',
          click: () => {
            this.mainWindow?.webContents.inspectElement(params.x, params.y);
          },
        },
        { type: 'separator' },
        { label: 'Cut', role: 'cut' },
        { label: 'Copy', role: 'copy' },
        { label: 'Paste', role: 'paste' },
        { type: 'separator' },
        { label: 'Select All', role: 'selectAll' },
        ...(hasLinkURL ? [{ type: 'separator' as const }] : []),
        {
          label: 'Open Link in Browser',
          visible: hasLinkURL,
          click: () => {
            if (params.linkURL) {
              shell.openExternal(params.linkURL);
            }
          },
        },
      ]);

      menu.popup({ window: this.mainWindow! });
    });
  }

  setupApplicationMenu() {
    const template = [
      {
        label: 'File',
        submenu: [
          {
            label: 'Quit',
            accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
            click: () => {
              this.isQuitting = true;
              app.quit();
            },
          },
        ],
      },
      {
        label: 'Edit',
        submenu: [
          { label: 'Undo', accelerator: 'CmdOrCtrl+Z', role: 'undo' },
          { label: 'Redo', accelerator: 'Shift+CmdOrCtrl+Z', role: 'redo' },
          { type: 'separator' },
          { label: 'Cut', accelerator: 'CmdOrCtrl+X', role: 'cut' },
          { label: 'Copy', accelerator: 'CmdOrCtrl+C', role: 'copy' },
          { label: 'Paste', accelerator: 'CmdOrCtrl+V', role: 'paste' },
        ],
      },
      {
        label: 'View',
        submenu: [
          { label: 'Reload', accelerator: 'CmdOrCtrl+R', role: 'reload' },
          {
            label: 'Force Reload',
            accelerator: 'CmdOrCtrl+Shift+R',
            role: 'forceReload',
          },
          {
            label: 'Toggle Developer Tools',
            accelerator: 'F12',
            click: () => {
              if (this.mainWindow) {
                this.mainWindow.webContents.toggleDevTools();
              }
            },
          },
          { type: 'separator' },
          {
            label: 'Actual Size',
            accelerator: 'CmdOrCtrl+0',
            role: 'resetZoom',
          },
          { label: 'Zoom In', accelerator: 'CmdOrCtrl+Plus', role: 'zoomIn' },
          { label: 'Zoom Out', accelerator: 'CmdOrCtrl+-', role: 'zoomOut' },
          { type: 'separator' },
          {
            label: 'Toggle Fullscreen',
            accelerator: 'F11',
            role: 'togglefullscreen',
          },
        ],
      },
      {
        label: 'Window',
        submenu: [
          { label: 'Minimize', accelerator: 'CmdOrCtrl+M', role: 'minimize' },
          { label: 'Close', accelerator: 'CmdOrCtrl+W', role: 'close' },
        ],
      },
      {
        label: 'Help',
        submenu: [
          {
            label: 'About',
            click: async () => {
              await this.showAboutDialog();
            },
          },
          {
            label: 'KoboldCpp Wiki',
            click: () => {
              shell.openExternal('https://github.com/LostRuins/koboldcpp/wiki');
            },
          },
        ],
      },
    ];

    const menu = Menu.buildFromTemplate(
      template as Parameters<typeof Menu.buildFromTemplate>[0]
    );
    Menu.setApplicationMenu(menu);
  }

  private async showAboutDialog() {
    const packagePath = join(app.getAppPath(), 'package.json');
    const packageInfo = require(packagePath);
    const electronVersion = process.versions.electron;
    const chromeVersion = process.versions.chrome;
    const nodeVersion = process.versions.node;
    const v8Version = process.versions.v8;
    const osInfo = `${process.platform} ${process.arch} ${os.release()}`;

    const aboutText = `Version: ${packageInfo.version}
Electron: ${electronVersion}
Chromium: ${chromeVersion}
Node.js: ${nodeVersion}
V8: ${v8Version}
OS: ${osInfo}`;

    const response = await dialog.showMessageBox(this.mainWindow!, {
      type: 'info',
      message: 'Friendly Kobold',
      detail: aboutText,
      buttons: ['Copy', 'OK'],
      defaultId: 1,
    });

    if (response.response === 0) {
      clipboard.writeText(aboutText);
    }
  }
}
