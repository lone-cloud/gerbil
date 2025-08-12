import { app } from 'electron';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { homedir } from 'os';

import { WindowManager } from './managers/WindowManager';
import { ConfigManager } from './managers/ConfigManager';
import { KoboldCppManager } from './managers/KoboldCppManager';
import { GitHubService } from './services/GitHubService';
import { GPUService } from './services/GPUService';
import { IPCHandlers } from './utils/IPCHandlers';

class FriendlyKoboldApp {
  private windowManager: WindowManager;
  private configManager: ConfigManager;
  private koboldManager: KoboldCppManager;
  private githubService: GitHubService;
  private gpuService: GPUService;
  private ipcHandlers: IPCHandlers;

  constructor() {
    this.windowManager = new WindowManager();
    this.configManager = new ConfigManager(this.getConfigPath());
    this.githubService = new GitHubService();
    this.gpuService = new GPUService();
    this.koboldManager = new KoboldCppManager(
      this.configManager,
      this.githubService
    );
    this.ipcHandlers = new IPCHandlers(
      this.koboldManager,
      this.configManager,
      this.githubService,
      this.gpuService
    );

    this.ensureInstallDirectory();
  }

  private getConfigPath() {
    return join(app.getPath('userData'), 'config.json');
  }

  private getDefaultInstallPath() {
    const platform = process.platform;
    const home = homedir();

    switch (platform) {
      case 'win32':
        return join(home, 'FriendlyKobold');
      case 'darwin':
        return join(home, 'Applications', 'FriendlyKobold');
      default:
        return join(home, '.local', 'share', 'friendly-kobold');
    }
  }

  private ensureInstallDirectory() {
    const installDir =
      this.configManager.getInstallDir() || this.getDefaultInstallPath();

    if (!this.configManager.getInstallDir()) {
      this.configManager.setInstallDir(installDir);
    }

    if (!existsSync(installDir)) {
      mkdirSync(installDir, { recursive: true });
    }
  }

  async initialize(): Promise<void> {
    await app.whenReady();

    this.windowManager.setupApplicationMenu();
    this.windowManager.createMainWindow();
    this.ipcHandlers.setupHandlers();

    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        app.quit();
      }
    });

    app.on('activate', () => {
      if (!this.windowManager.getMainWindow()) {
        this.windowManager.createMainWindow();
      }
    });
  }
}

const friendlyKoboldApp = new FriendlyKoboldApp();
friendlyKoboldApp.initialize().catch(console.error);
