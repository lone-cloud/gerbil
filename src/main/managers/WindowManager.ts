import {
  BrowserWindow,
  app,
  Menu,
  shell,
  ipcMain,
  nativeImage,
} from 'electron';
import * as os from 'os';
import { join } from 'path';
import { GITHUB_API } from '../../constants';

export class WindowManager {
  private mainWindow: BrowserWindow | null = null;

  private getIconPath(): string {
    if (process.env.NODE_ENV === 'development') {
      return join(__dirname, '../../assets/icon.png');
    }
    return join(process.resourcesPath, 'assets/icon.png');
  }

  private isDevelopment(): boolean {
    return process.env.NODE_ENV === 'development' || !app.isPackaged;
  }

  createMainWindow(): BrowserWindow {
    const iconPath = this.getIconPath();
    const iconImage = nativeImage.createFromPath(iconPath);

    this.mainWindow = new BrowserWindow({
      width: 1000,
      height: 600,
      icon: iconImage,
      title: 'Friendly Kobold',
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

      if (
        process.env.WAYLAND_DISPLAY ||
        process.env.XDG_SESSION_TYPE === 'wayland'
      ) {
        this.mainWindow.setRepresentedFilename('');

        const retrySetIcon = () => {
          if (this.mainWindow && !this.mainWindow.isDestroyed()) {
            this.mainWindow.setIcon(iconImage);
          }
        };

        setTimeout(retrySetIcon, 50);
        setTimeout(retrySetIcon, 100);
        setTimeout(retrySetIcon, 250);
        setTimeout(retrySetIcon, 500);
        setTimeout(retrySetIcon, 1000);

        this.mainWindow.on('show', retrySetIcon);
        this.mainWindow.on('focus', retrySetIcon);
        this.mainWindow.on('restore', retrySetIcon);
      }
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

    this.mainWindow.webContents.setWindowOpenHandler(({ url }) => {
      const parsedUrl = new URL(url);

      if (
        parsedUrl.hostname === 'localhost' ||
        parsedUrl.hostname === '127.0.0.1'
      ) {
        return { action: 'allow' };
      }

      shell.openExternal(url);

      return { action: 'deny' };
    });

    this.mainWindow.on('close', () => {
      app.quit();
    });

    this.setupContextMenu();
    return this.mainWindow;
  }

  getMainWindow(): BrowserWindow | null {
    return this.mainWindow;
  }

  public cleanup() {
    if (this.mainWindow) {
      this.mainWindow.removeAllListeners();
    }
  }

  private setupContextMenu() {
    if (!this.mainWindow) return;

    this.mainWindow.webContents.on('context-menu', (_event, params) => {
      const hasLinkURL = !!params.linkURL;
      const isDev = this.isDevelopment();

      const menuTemplate = [
        ...(isDev
          ? [
              {
                label: 'Inspect Element',
                click: () => {
                  this.mainWindow?.webContents.inspectElement(
                    params.x,
                    params.y
                  );
                },
              },
              { type: 'separator' as const },
            ]
          : []),
        { label: 'Cut', role: 'cut' as const },
        { label: 'Copy', role: 'copy' as const },
        { label: 'Paste', role: 'paste' as const },
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
      ];

      const menu = Menu.buildFromTemplate(menuTemplate);
      menu.popup({ window: this.mainWindow! });
    });
  }

  setupApplicationMenu() {
    const isDev = this.isDevelopment();

    const template = [
      {
        label: 'File',
        submenu: [
          {
            label: 'Quit',
            accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
            click: () => {
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
          ...(isDev
            ? [
                {
                  label: 'Reload',
                  accelerator: 'CmdOrCtrl+R',
                  role: 'reload' as const,
                },
                {
                  label: 'Force Reload',
                  accelerator: 'CmdOrCtrl+Shift+R',
                  role: 'forceReload' as const,
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
                { type: 'separator' as const },
              ]
            : []),
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
            label: 'KoboldCpp Wiki',
            click: () => {
              shell.openExternal(
                `https://github.com/${GITHUB_API.KOBOLDCPP_REPO}/wiki`
              );
            },
          },
          {
            label: 'View Error Logs',
            click: () => {
              const logsDir = join(app.getPath('userData'), 'logs');
              shell.openPath(logsDir);
            },
          },
          { type: 'separator' },
          {
            label: 'About',
            click: async () => {
              await this.showAboutDialog();
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

    const versionText = `Version: ${packageInfo.version}
Electron: ${electronVersion}
Chromium: ${chromeVersion}
Node.js: ${nodeVersion}
V8: ${v8Version}
OS: ${osInfo}`;

    const aboutWindow = new BrowserWindow({
      width: 500,
      height: 400,
      modal: true,
      parent: this.mainWindow!,
      resizable: false,
      minimizable: false,
      maximizable: false,
      show: false,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
      },
    });

    aboutWindow.setMenu(null);

    const htmlPath = this.getTemplatePath('about-dialog.html');
    await aboutWindow.loadFile(htmlPath);

    aboutWindow.webContents.executeJavaScript(
      `setVersionInfo(\`${versionText}\`)`
    );

    aboutWindow.once('ready-to-show', () => {
      aboutWindow.show();
    });

    ipcMain.once('open-github', () => {
      shell.openExternal(
        `https://github.com/${GITHUB_API.FRIENDLY_KOBOLD_REPO}`
      );
    });

    ipcMain.once('close-about-dialog', () => {
      aboutWindow.close();
    });

    aboutWindow.on('closed', () => {
      ipcMain.removeAllListeners('open-github');
      ipcMain.removeAllListeners('close-about-dialog');
    });
  }

  private getTemplatePath(filename: string): string {
    if (process.env.NODE_ENV === 'development') {
      return join(__dirname, '../../src/main/templates', filename);
    }
    return join(process.resourcesPath, 'templates', filename);
  }
}
