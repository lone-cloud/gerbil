import { app } from 'electron';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { homedir } from 'os';

import { WindowManager } from '@/main/managers/WindowManager';
import { ConfigManager } from '@/main/managers/ConfigManager';
import { KoboldCppManager } from '@/main/managers/KoboldCppManager';
import { GitHubService } from '@/main/services/GitHubService';
import { GPUService } from '@/main/services/GPUService';
import { IPCHandlers } from '@/main/utils/IPCHandlers';
import { APP_NAME, CONFIG_FILE_NAME } from '@/constants/app';

class FriendlyKoboldApp {
  private windowManager: WindowManager;
  private configManager: ConfigManager;
  private koboldManager: KoboldCppManager;
  private githubService: GitHubService;
  private gpuService: GPUService;
  private ipcHandlers: IPCHandlers;

  constructor() {
    this.configManager = new ConfigManager(this.getConfigPath());
    this.ensureInstallDirectory();

    this.windowManager = new WindowManager(this.configManager);
    this.githubService = new GitHubService();
    this.gpuService = new GPUService();
    this.koboldManager = new KoboldCppManager(
      this.configManager,
      this.githubService,
      this.windowManager
    );
    this.ipcHandlers = new IPCHandlers(
      this.koboldManager,
      this.configManager,
      this.githubService,
      this.gpuService
    );
  }

  private getConfigPath() {
    return join(app.getPath('userData'), CONFIG_FILE_NAME);
  }

  private getDefaultInstallPath() {
    const platform = process.platform;
    const home = homedir();

    switch (platform) {
      case 'win32':
        return join(home, APP_NAME);
      case 'darwin':
        return join(home, 'Applications', APP_NAME);
      default:
        return join(home, '.local', 'share', APP_NAME);
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
    if (process.platform === 'linux') {
      if (process.env.ELECTRON_OZONE_PLATFORM_HINT === 'wayland') {
        app.commandLine.appendSwitch('enable-features', 'UseOzonePlatform');
        app.commandLine.appendSwitch('ozone-platform', 'wayland');
      }
    }

    await app.whenReady();

    this.windowManager.setupApplicationMenu();
    this.windowManager.createMainWindow();
    this.ipcHandlers.setupHandlers();

    app.on('window-all-closed', () => {
      if (process.platform === 'darwin') {
        return;
      }

      app.quit();
    });

    app.on('before-quit', async (event) => {
      event.preventDefault();

      await this.koboldManager.cleanup();

      this.windowManager.cleanup();

      app.exit(0);
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
