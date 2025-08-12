import { BrowserWindow, app, Menu, shell } from 'electron';
import { join } from 'path';

export class WindowManager {
  private mainWindow: BrowserWindow | null = null;

  createMainWindow(): BrowserWindow {
    this.mainWindow = new BrowserWindow({
      width: 1000,
      height: 600,
      icon: join(process.cwd(), 'assets', 'icon.png'),
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

    this.setupContextMenu();
    return this.mainWindow;
  }

  getMainWindow(): BrowserWindow | null {
    return this.mainWindow;
  }

  private setupContextMenu() {
    if (!this.mainWindow) return;

    this.mainWindow.webContents.on('context-menu', (_event, params) => {
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
        { type: 'separator' },
        {
          label: 'Open Link in Browser',
          visible: !!params.linkURL,
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
    ];

    const menu = Menu.buildFromTemplate(
      template as Parameters<typeof Menu.buildFromTemplate>[0]
    );
    Menu.setApplicationMenu(menu);
  }
}
