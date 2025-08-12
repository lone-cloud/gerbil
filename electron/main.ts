import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import { homedir } from 'os';
import {
  createWriteStream,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  readdirSync,
  statSync,
} from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let mainWindow: BrowserWindow | null = null;

interface GitHubAsset {
  name: string;
  browser_download_url: string;
  size: number;
}

interface GitHubRelease {
  tag_name: string;
  name: string;
  published_at: string;
  assets: GitHubAsset[];
}

interface InstalledVersion {
  version: string;
  path: string;
  type: 'github' | 'rocm';
  downloadDate: string;
  lastUsed?: string;
  filename: string;
}

interface AppConfig {
  installedVersions?: InstalledVersion[];
  currentVersion?: string;
  installPath?: string;
  lastUpdateCheck?: string;
}

class KoboldCppManager {
  private configPath: string;
  private installDir: string;
  private config: AppConfig;

  constructor() {
    this.configPath = join(app.getPath('userData'), 'config.json');
    this.config = this.loadConfig();

    this.installDir = this.config.installPath || this.getDefaultInstallPath();

    if (!existsSync(this.installDir)) {
      mkdirSync(this.installDir, { recursive: true });
    }
  }

  private getDefaultInstallPath(): string {
    const platform = process.platform;
    const home = homedir();

    switch (platform) {
      case 'win32':
        return join(home, 'KoboldCpp');
      case 'darwin':
        return join(home, 'Applications', 'KoboldCpp');
      default: // linux and others
        return join(home, '.local', 'share', 'koboldcpp');
    }
  }

  private loadConfig(): AppConfig {
    try {
      if (existsSync(this.configPath)) {
        return JSON.parse(readFileSync(this.configPath, 'utf8'));
      }
    } catch (error) {
      console.error('Error loading config:', error);
    }
    return {};
  }

  private saveConfig() {
    try {
      writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
    } catch (error) {
      console.error('Error saving config:', error);
    }
  }

  async getLatestRelease(): Promise<GitHubRelease | null> {
    try {
      const response = await fetch(
        'https://api.github.com/repos/LostRuins/koboldcpp/releases/latest'
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return (await response.json()) as GitHubRelease;
    } catch (error) {
      console.error('Error fetching latest release:', error);
      return null;
    }
  }

  async getAllReleases(): Promise<GitHubRelease[]> {
    try {
      const response = await fetch(
        'https://api.github.com/repos/LostRuins/koboldcpp/releases'
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return (await response.json()) as GitHubRelease[];
    } catch (error) {
      console.error('Error fetching releases:', error);
      return [];
    }
  }

  async downloadRelease(
    asset: GitHubRelease['assets'][0],
    onProgress?: (progress: number) => void
  ): Promise<string> {
    const filePath = join(this.installDir, asset.name);

    const response = await fetch(asset.browser_download_url);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const totalBytes = asset.size;
    let downloadedBytes = 0;

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Failed to get response reader');
    }

    const writer = createWriteStream(filePath);

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        downloadedBytes += value.length;

        writer.write(value);

        if (onProgress && totalBytes > 0) {
          onProgress((downloadedBytes / totalBytes) * 100);
        }
      }

      writer.end();

      await new Promise<void>((resolve, reject) => {
        writer.on('finish', () => resolve());
        writer.on('error', reject);
      });
    } finally {
      reader.releaseLock();
    }

    return filePath;
  }

  async getInstalledVersions(): Promise<InstalledVersion[]> {
    const configVersions = this.config.installedVersions || [];
    const scannedVersions: InstalledVersion[] = [];

    try {
      if (existsSync(this.installDir)) {
        const files = readdirSync(this.installDir);

        for (const file of files) {
          const filePath = join(this.installDir, file);

          if (
            statSync(filePath).isFile() &&
            (file.includes('koboldcpp') || file.includes('kobold'))
          ) {
            const existingVersion = configVersions.find(
              (v) => v.path === filePath
            );

            if (existingVersion) {
              scannedVersions.push(existingVersion);
            } else {
              try {
                const detectedVersion =
                  await this.getVersionFromBinary(filePath);
                const version = detectedVersion || 'unknown';

                const newVersion: InstalledVersion = {
                  version,
                  path: filePath,
                  type: 'github',
                  downloadDate: new Date().toISOString(),
                  lastUsed: new Date().toISOString(),
                  filename: file,
                };

                scannedVersions.push(newVersion);
              } catch (error) {
                console.warn(`Could not detect version for ${file}:`, error);
              }
            }
          }
        }
      }
    } catch (error) {
      console.warn('Error scanning install directory:', error);
      return configVersions.filter((version) => existsSync(version.path));
    }

    // Update config with newly found versions
    if (
      scannedVersions.length !== configVersions.length ||
      !scannedVersions.every((sv) =>
        configVersions.some((cv) => cv.path === sv.path)
      )
    ) {
      this.config.installedVersions = scannedVersions;
      this.saveConfig();
    }

    return scannedVersions;
  }

  async isInstalled(): Promise<boolean> {
    const versions = await this.getInstalledVersions();
    return versions.some((version) => existsSync(version.path));
  }

  async getCurrentVersion(): Promise<InstalledVersion | null> {
    const versions = await this.getInstalledVersions();

    if (this.config.currentVersion) {
      const found =
        versions.find((v) => v.version === this.config.currentVersion) || null;
      return found;
    }

    // Return the most recently used version or the first one
    const fallback =
      versions.sort(
        (a, b) =>
          new Date(b.lastUsed || b.downloadDate).getTime() -
          new Date(a.lastUsed || a.downloadDate).getTime()
      )[0] || null;
    return fallback;
  }

  async setCurrentVersion(version: string): Promise<boolean> {
    const versions = await this.getInstalledVersions();
    const targetVersion = versions.find((v) => v.version === version);

    if (!targetVersion) {
      return false;
    }

    if (!existsSync(targetVersion.path)) {
      // Remove this version from the config since the file no longer exists
      this.config.installedVersions = versions.filter(
        (v) => v.version !== version
      );
      this.saveConfig();
      return false;
    }

    this.config.currentVersion = version;

    // Update the last used timestamp for this version
    const versionToUpdate = this.config.installedVersions?.find(
      (v) => v.version === version
    );
    if (versionToUpdate) {
      versionToUpdate.lastUsed = new Date().toISOString();
    }

    this.saveConfig();
    return true;
  }

  async getVersionFromBinary(binaryPath: string): Promise<string | null> {
    return new Promise((resolve) => {
      try {
        if (!existsSync(binaryPath)) {
          resolve(null);
          return;
        }

        const process = spawn(binaryPath, ['--version'], {
          stdio: ['ignore', 'pipe', 'pipe'],
          timeout: 10000,
        });

        let output = '';
        let errorOutput = '';

        process.stdout.on('data', (data) => {
          output += data.toString();
        });

        process.stderr.on('data', (data) => {
          errorOutput += data.toString();
        });

        process.on('close', () => {
          const allOutput = (output + errorOutput).trim();

          // If the output looks like a clean version number, use it directly
          if (/^\d+\.\d+/.test(allOutput)) {
            const versionParts = allOutput.split(/\s+/)[0];
            if (versionParts && /^\d+\.\d+/.test(versionParts)) {
              resolve(versionParts);
              return;
            }
          }

          // Fallback: look for version patterns in longer output
          const lines = allOutput.split('\n');
          for (const line of lines) {
            const trimmedLine = line.trim();
            if (/^\d+\.\d+/.test(trimmedLine)) {
              const versionPart = trimmedLine.split(/\s+/)[0];
              if (versionPart) {
                resolve(versionPart);
                return;
              }
            }
          }

          resolve(null);
        });

        process.on('error', (error) => {
          console.warn('Version detection process error:', error);
          resolve(null);
        });

        // Timeout fallback
        setTimeout(() => {
          try {
            process.kill('SIGTERM');
          } catch {
            // Process might already be dead
          }
          resolve(null);
        }, 10000);
      } catch (error) {
        console.warn('Version detection error:', error);
        resolve(null);
      }
    });
  }

  async getInstalledVersion(): Promise<string | undefined> {
    // Legacy compatibility method
    const currentVersion = await this.getCurrentVersion();
    return currentVersion?.version;
  }

  getInstallPath(): string | undefined {
    return this.config.installPath;
  }

  getCurrentInstallDir(): string {
    return this.installDir;
  }

  async selectInstallDirectory(): Promise<string | null> {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory', 'createDirectory'],
      title: 'Select KoboldCpp Installation Directory',
      defaultPath: this.installDir,
    });

    if (!result.canceled && result.filePaths.length > 0) {
      const newPath = join(result.filePaths[0], 'KoboldCpp');
      this.installDir = newPath;
      this.config.installPath = newPath;
      this.saveConfig();

      if (!existsSync(newPath)) {
        mkdirSync(newPath, { recursive: true });
      }

      return newPath;
    }

    return null;
  }

  async addInstalledVersion(
    version: string,
    path: string,
    type: 'github' | 'rocm' = 'github'
  ) {
    const versions = await this.getInstalledVersions();

    // Remove existing version if it exists
    this.config.installedVersions = versions.filter(
      (v) => v.version !== version
    );

    // Extract filename from path
    const filename = path.split(/[/\\]/).pop() || 'unknown';

    // Add new version
    const newVersion: InstalledVersion = {
      version,
      path,
      type,
      downloadDate: new Date().toISOString(),
      lastUsed: new Date().toISOString(),
      filename,
    };

    this.config.installedVersions = [
      ...(this.config.installedVersions || []),
      newVersion,
    ];
    this.config.currentVersion = version;
    this.saveConfig();
  }

  async getROCmDownload(): Promise<{
    name: string;
    url: string;
    size: number;
    type: 'rocm';
    version?: string;
  } | null> {
    const platform = process.platform;
    if (platform !== 'linux') {
      return null;
    }

    // Get the latest release version to use for ROCm
    const latestRelease = await this.getLatestRelease();
    const version = latestRelease?.tag_name?.replace(/^v/, '') || 'unknown';

    return {
      name: 'koboldcpp-linux-x64-rocm',
      url: 'https://koboldai.org/cpplinuxrocm',
      size: 1024 * 1024 * 1024, // ~1GB estimation
      type: 'rocm',
      version,
    };
  }

  async downloadROCm(): Promise<{
    success: boolean;
    path?: string;
    error?: string;
  }> {
    try {
      const platform = process.platform;
      if (platform !== 'linux') {
        return {
          success: false,
          error: 'ROCm version is only available for Linux',
        };
      }

      const response = await fetch('https://koboldai.org/cpplinuxrocm');
      if (!response.ok) {
        return {
          success: false,
          error: `Failed to download: ${response.statusText}`,
        };
      }

      const filename = 'koboldcpp-rocm';
      const filePath = join(this.installDir, filename);

      // Use the same download logic as downloadRelease
      const totalBytes = 1024 * 1024 * 1024; // ~1GB estimation
      let downloadedBytes = 0;

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Failed to get response reader');
      }

      const writer = createWriteStream(filePath);

      try {
        while (true) {
          const { done, value } = await reader.read();

          if (done) break;

          downloadedBytes += value.length;
          writer.write(value);

          if (mainWindow && totalBytes > 0) {
            mainWindow.webContents.send(
              'download-progress',
              (downloadedBytes / totalBytes) * 100
            );
          }
        }

        writer.end();

        await new Promise<void>((resolve, reject) => {
          writer.on('finish', () => resolve());
          writer.on('error', reject);
        });
      } finally {
        reader.releaseLock();
      }

      // Make executable
      try {
        const fs = await import('fs');
        fs.chmodSync(filePath, 0o755);
      } catch (chmodError) {
        console.warn('Could not make ROCm binary executable:', chmodError);
      }

      // Try to get version from binary, but if that fails, use the latest release version
      const detectedVersion = await this.getVersionFromBinary(filePath);
      let version = detectedVersion;

      if (!version || version === 'rocm-unknown') {
        // Fallback to latest release version
        const latestRelease = await this.getLatestRelease();
        version = latestRelease?.tag_name?.replace(/^v/, '') || 'rocm-unknown';
      }

      await this.addInstalledVersion(version, filePath, 'rocm');

      return { success: true, path: filePath };
    } catch (error) {
      console.error('ROCm download error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async checkForUpdates(): Promise<{
    currentVersion: string;
    latestVersion: string;
    releaseInfo: GitHubRelease;
    hasUpdate: boolean;
  } | null> {
    try {
      const currentVersion = await this.getCurrentVersion();
      if (!currentVersion) {
        return null; // No current version to compare against
      }

      const latestRelease = await this.getLatestRelease();
      if (!latestRelease) {
        return null;
      }

      const latestVersion = latestRelease.tag_name.replace(/^v/, '');
      const current = currentVersion.version.replace(/^v/, '');

      const hasUpdate = this.compareVersions(current, latestVersion) < 0;

      return {
        currentVersion: current,
        latestVersion,
        releaseInfo: latestRelease,
        hasUpdate,
      };
    } catch (error) {
      console.error('Update check error:', error);
      return null;
    }
  }

  async getLatestReleaseWithDownloadStatus(): Promise<{
    release: GitHubRelease;
    availableAssets: Array<{
      asset: GitHubAsset;
      isDownloaded: boolean;
      installedVersion?: string;
    }>;
  } | null> {
    try {
      const latestRelease = await this.getLatestRelease();
      if (!latestRelease) return null;

      const installedVersions = await this.getInstalledVersions();
      const platform = process.platform;

      // Filter assets by platform like in the download screen
      const platformAssets = this.filterAssetsByPlatform(
        latestRelease.assets,
        platform
      );

      const availableAssets = platformAssets.map((asset) => {
        const installedVersion = installedVersions.find((v) => {
          const filename = v.filename || v.path.split(/[/\\]/).pop() || '';
          return filename === asset.name;
        });

        return {
          asset,
          isDownloaded: !!installedVersion,
          installedVersion: installedVersion?.version,
        };
      });

      return {
        release: latestRelease,
        availableAssets,
      };
    } catch (error) {
      console.error('Error getting release with download status:', error);
      return null;
    }
  }

  private filterAssetsByPlatform(
    assets: GitHubAsset[],
    platform: string
  ): GitHubAsset[] {
    return assets.filter((asset) => {
      const name = asset.name.toLowerCase();

      switch (platform) {
        case 'win32':
          return (
            name.includes('windows') ||
            name.includes('win') ||
            name.includes('.exe')
          );
        case 'darwin':
          return (
            name.includes('macos') ||
            name.includes('mac') ||
            name.includes('darwin')
          );
        case 'linux':
          return name.includes('linux') || name.includes('ubuntu');
        default:
          return true;
      }
    });
  }

  private compareVersions(a: string, b: string): number {
    const aParts = a.split('.').map(Number);
    const bParts = b.split('.').map(Number);

    for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
      const aPart = aParts[i] || 0;
      const bPart = bParts[i] || 0;

      if (aPart < bPart) return -1;
      if (aPart > bPart) return 1;
    }

    return 0;
  }

  async setInstalled(version: string, path: string) {
    // Legacy compatibility method
    await this.addInstalledVersion(version, path, 'github');
  }

  shouldCheckForUpdates(): boolean {
    if (!this.config.lastUpdateCheck) return true;

    const lastCheck = new Date(this.config.lastUpdateCheck);
    const now = new Date();
    const daysSinceLastCheck =
      (now.getTime() - lastCheck.getTime()) / (1000 * 60 * 60 * 24);

    return daysSinceLastCheck >= 1;
  }

  updateLastCheckTime() {
    this.config.lastUpdateCheck = new Date().toISOString();
    this.saveConfig();
  }
}

const isDev = !app.isPackaged;
const koboldManager = new KoboldCppManager();

function createWindow(): void {
  const preloadPath = join(__dirname, 'preload.js');

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: preloadPath,
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: !isDev,
      devTools: true,
    },
    titleBarStyle: 'default',
    icon: join(__dirname, '../../assets/icon.png'),
    autoHideMenuBar: true,
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.once('did-finish-load', () => {
      try {
        mainWindow?.webContents.openDevTools({ mode: 'detach' });
      } catch (error) {
        console.error('Failed to open dev tools:', error);
      }
    });
  } else {
    mainWindow.loadFile(join(__dirname, '../index.html'));
  }

  mainWindow.webContents.on('did-finish-load', () => {
    // Window loaded successfully
  });

  mainWindow.webContents.on(
    'did-fail-load',
    (_, errorCode, errorDescription) => {
      console.error('Window failed to load:', errorCode, errorDescription);
    }
  );

  // Enhanced dev tools keyboard shortcuts
  mainWindow.webContents.on('before-input-event', (_, input) => {
    // F12 to toggle dev tools
    if (input.key === 'F12') {
      if (mainWindow?.webContents.isDevToolsOpened()) {
        mainWindow.webContents.closeDevTools();
      } else {
        try {
          mainWindow?.webContents.openDevTools({ mode: 'detach' });
        } catch (error) {
          console.error('Failed to open dev tools via F12:', error);
        }
      }
    }
    // Ctrl+Shift+I (or Cmd+Shift+I on Mac) to toggle dev tools
    if ((input.control || input.meta) && input.shift && input.key === 'I') {
      if (mainWindow?.webContents.isDevToolsOpened()) {
        mainWindow.webContents.closeDevTools();
      } else {
        try {
          mainWindow?.webContents.openDevTools({ mode: 'detach' });
        } catch (error) {
          console.error('Failed to open dev tools via Ctrl+Shift+I:', error);
        }
      }
    }
    // Ctrl+Shift+C (or Cmd+Shift+C on Mac) to open dev tools in inspect element mode
    if ((input.control || input.meta) && input.shift && input.key === 'C') {
      try {
        mainWindow?.webContents.openDevTools({ mode: 'detach' });
      } catch (error) {
        console.error('Failed to open dev tools via Ctrl+Shift+C:', error);
      }
    }
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });

  if (koboldManager.shouldCheckForUpdates()) {
    checkForUpdates();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

async function checkForUpdates() {
  try {
    const latestRelease = await koboldManager.getLatestRelease();
    if (!latestRelease) return;

    const installedVersion = await koboldManager.getInstalledVersion();
    koboldManager.updateLastCheckTime();

    if (installedVersion && installedVersion !== latestRelease.tag_name) {
      const windows = BrowserWindow.getAllWindows();
      if (windows.length > 0) {
        windows[0].webContents.send('update-available', {
          currentVersion: installedVersion,
          latestVersion: latestRelease.tag_name,
          releaseInfo: latestRelease,
        });
      }
    }
  } catch (error) {
    console.error('Error checking for updates:', error);
  }
}

ipcMain.handle('kobold:isInstalled', () => koboldManager.isInstalled());

ipcMain.handle('kobold:getInstalledVersion', () =>
  koboldManager.getInstalledVersion()
);

ipcMain.handle('kobold:getInstalledVersions', () =>
  koboldManager.getInstalledVersions()
);

ipcMain.handle('kobold:getCurrentVersion', () =>
  koboldManager.getCurrentVersion()
);

ipcMain.handle('kobold:setCurrentVersion', (_, version) =>
  koboldManager.setCurrentVersion(version)
);

ipcMain.handle('kobold:getVersionFromBinary', (_, binaryPath) =>
  koboldManager.getVersionFromBinary(binaryPath)
);

ipcMain.handle('kobold:checkForUpdates', () => koboldManager.checkForUpdates());

ipcMain.handle('kobold:getLatestReleaseWithStatus', () =>
  koboldManager.getLatestReleaseWithDownloadStatus()
);

ipcMain.handle('kobold:openDevTools', () => {
  try {
    if (
      mainWindow &&
      mainWindow.webContents &&
      !mainWindow.webContents.isDestroyed()
    ) {
      mainWindow.webContents.openDevTools({ mode: 'detach' });
      return { success: true };
    } else {
      return { success: false, error: 'Window not available' };
    }
  } catch (error) {
    console.error('IPC: Failed to open dev tools:', error);
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('kobold:getROCmDownload', () => koboldManager.getROCmDownload());

ipcMain.handle('kobold:downloadROCm', async () => {
  try {
    return await koboldManager.downloadROCm();
  } catch (error) {
    console.error('ROCm download failed:', error);
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('kobold:getLatestRelease', () =>
  koboldManager.getLatestRelease()
);

ipcMain.handle('kobold:getAllReleases', () => koboldManager.getAllReleases());

ipcMain.handle('kobold:getPlatform', () => ({
  platform: process.platform,
  arch: process.arch,
}));

ipcMain.handle('kobold:getCurrentInstallDir', () =>
  koboldManager.getCurrentInstallDir()
);

ipcMain.handle('kobold:selectInstallDirectory', () =>
  koboldManager.selectInstallDirectory()
);

ipcMain.handle('kobold:downloadRelease', async (event, asset) => {
  try {
    const filePath = await koboldManager.downloadRelease(asset, (progress) => {
      event.sender.send('download-progress', progress);
    });

    // Make the file executable (especially important on Unix-like systems)
    try {
      const fs = await import('fs');
      fs.chmodSync(filePath, 0o755);
    } catch (chmodError) {
      console.warn('Could not make binary executable:', chmodError);
    }

    // Try to get actual version from binary now that it's executable
    const detectedVersion = await koboldManager.getVersionFromBinary(filePath);
    let version: string = detectedVersion || 'unknown';

    // Fallback to asset tag_name if version detection fails
    if (version === 'unknown') {
      const assetVersion = asset.tag_name || 'unknown';
      if (assetVersion !== 'unknown') {
        version = assetVersion.replace(/^v/, ''); // Remove 'v' prefix if present
      } else {
        version = 'unknown';
      }
    }

    await koboldManager.addInstalledVersion(version, filePath, 'github');
    return { success: true, path: filePath };
  } catch (error) {
    console.error('Download failed:', error);
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('kobold:launchKoboldCpp', async (_, args = []) => {
  const currentVersion = await koboldManager.getCurrentVersion();
  if (!currentVersion || !existsSync(currentVersion.path)) {
    return {
      success: false,
      error: 'KoboldCpp not found or no version selected',
    };
  }

  try {
    const child = spawn(currentVersion.path, args, {
      detached: true,
      stdio: 'ignore',
    });

    // Update last used timestamp
    await koboldManager.setCurrentVersion(currentVersion.version);

    child.unref();
    return { success: true, pid: child.pid };
  } catch (error) {
    console.error('Failed to launch KoboldCpp:', error);
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('kobold:openInstallDialog', async () => {
  const result = await dialog.showOpenDialog({
    title: 'Select KoboldCpp executable',
    filters: [
      { name: 'Executables', extensions: ['exe', 'app', 'AppImage'] },
      { name: 'All Files', extensions: ['*'] },
    ],
    properties: ['openFile'],
  });

  if (!result.canceled && result.filePaths.length > 0) {
    const filePath = result.filePaths[0];

    // Make the file executable if it's not a Windows executable
    if (!filePath.endsWith('.exe')) {
      try {
        const fs = await import('fs');
        fs.chmodSync(filePath, 0o755);
      } catch (chmodError) {
        console.warn('Could not make binary executable:', chmodError);
      }
    }

    // Try to detect version from the binary
    const detectedVersion = await koboldManager.getVersionFromBinary(filePath);
    const version = detectedVersion || 'manual-install';

    await koboldManager.addInstalledVersion(version, filePath, 'github');
    return { success: true, path: filePath };
  }

  return { success: false };
});

ipcMain.handle('app:getVersion', () => app.getVersion());

ipcMain.handle('app:openExternal', async (_, url) => {
  await shell.openExternal(url);
});
