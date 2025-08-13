import { spawn, ChildProcess } from 'child_process';
import { join } from 'path';
import {
  existsSync,
  readdirSync,
  statSync,
  createWriteStream,
  chmodSync,
  readFileSync,
} from 'fs';
import { dialog } from 'electron';
import { GitHubService } from '@/main/services/GitHubService';
import { ConfigManager } from '@/main/managers/ConfigManager';
import { WindowManager } from '@/main/managers/WindowManager';
import { APP_NAME, DIALOG_TITLES, ROCM } from '@/constants/app';

interface GitHubAsset {
  name: string;
  browser_download_url: string;
  size: number;
  created_at: string;
}

interface GitHubRelease {
  tag_name: string;
  name: string;
  published_at: string;
  body: string;
  assets: GitHubAsset[];
}

interface UpdateInfo {
  currentVersion: string;
  latestVersion: string;
  releaseInfo: GitHubRelease;
  hasUpdate: boolean;
}

interface ReleaseWithStatus {
  release: GitHubRelease;
  availableAssets: Array<{
    asset: GitHubAsset;
    isDownloaded: boolean;
    installedVersion?: string;
  }>;
}

export interface InstalledVersion {
  version: string;
  path: string;
  filename: string;
}

export class KoboldCppManager {
  private installDir: string;
  private koboldProcess: ChildProcess | null = null;
  private configManager: ConfigManager;
  private githubService: GitHubService;
  private windowManager: WindowManager;

  constructor(
    configManager: ConfigManager,
    githubService: GitHubService,
    windowManager: WindowManager
  ) {
    this.configManager = configManager;
    this.githubService = githubService;
    this.windowManager = windowManager;
    this.installDir =
      this.configManager.getInstallDir() ||
      join(process.env.HOME || process.env.USERPROFILE || '.', APP_NAME);
  }

  async downloadRelease(
    asset: GitHubAsset,
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

    if (process.platform !== 'win32') {
      try {
        chmodSync(filePath, 0o755);
      } catch (error) {
        console.warn('Failed to make binary executable:', error);
      }
    }

    const currentBinary = this.configManager.getCurrentKoboldBinary();
    if (!currentBinary) {
      this.configManager.setCurrentKoboldBinary(filePath);
    }

    return filePath;
  }

  async getInstalledVersions(): Promise<InstalledVersion[]> {
    const scannedVersions: InstalledVersion[] = [];

    try {
      if (existsSync(this.installDir)) {
        const files = readdirSync(this.installDir);

        for (const file of files) {
          const filePath = join(this.installDir, file);

          if (statSync(filePath).isFile() && file.startsWith('koboldcpp')) {
            try {
              const detectedVersion = await this.getVersionFromBinary(filePath);
              const version = detectedVersion || 'unknown';

              const newVersion: InstalledVersion = {
                version,
                path: filePath,
                filename: file,
              };

              scannedVersions.push(newVersion);
            } catch (error) {
              console.warn(`Could not detect version for ${file}:`, error);
            }
          }
        }
      }
    } catch (error) {
      console.warn('Error scanning install directory:', error);
    }

    return scannedVersions;
  }

  async isInstalled(): Promise<boolean> {
    try {
      if (!existsSync(this.installDir)) {
        return false;
      }

      const files = readdirSync(this.installDir);

      for (const file of files) {
        const filePath = join(this.installDir, file);

        try {
          const stats = statSync(filePath);

          // Check if it's a file (not directory) and starts with "koboldcpp"
          if (stats.isFile() && file.startsWith('koboldcpp')) {
            // On Unix-like systems, check if file is executable
            if (process.platform !== 'win32') {
              // Check if the file has execute permission (owner, group, or other)
              const isExecutable = (stats.mode & parseInt('111', 8)) !== 0;
              if (isExecutable) {
                return true;
              }
            } else {
              // On Windows, if it's a file starting with koboldcpp, consider it valid
              // (Windows doesn't use Unix-style executable permissions)
              return true;
            }
          }
        } catch {
          // Skip files we can't stat (permission issues, etc.)
          continue;
        }
      }

      return false;
    } catch (error) {
      console.warn('Error checking installation:', error);
      return false;
    }
  }

  async getConfigFiles(): Promise<
    Array<{ name: string; path: string; size: number }>
  > {
    const configFiles: Array<{ name: string; path: string; size: number }> = [];

    try {
      if (existsSync(this.installDir)) {
        const files = readdirSync(this.installDir);

        for (const file of files) {
          const filePath = join(this.installDir, file);

          if (
            statSync(filePath).isFile() &&
            (file.endsWith('.kcpps') || file.endsWith('.kcppt'))
          ) {
            const stats = statSync(filePath);
            configFiles.push({
              name: file,
              path: filePath,
              size: stats.size,
            });
          }
        }
      }
    } catch (error) {
      console.warn('Error scanning for config files:', error);
    }

    return configFiles.sort((a, b) => a.name.localeCompare(b.name));
  }

  async parseConfigFile(filePath: string): Promise<{
    gpulayers?: number;
    contextsize?: number;
    model_param?: string;
    [key: string]: unknown;
  } | null> {
    try {
      if (!existsSync(filePath)) {
        return null;
      }

      const content = readFileSync(filePath, 'utf-8');
      const config = JSON.parse(content);

      return config;
    } catch (error) {
      console.warn('Error parsing config file:', error);
      return null;
    }
  }

  async selectModelFile(): Promise<string | null> {
    try {
      const mainWindow = this.windowManager.getMainWindow();
      if (!mainWindow) {
        return null;
      }

      const result = await dialog.showOpenDialog(mainWindow, {
        title: 'Select Model File',
        filters: [
          { name: 'GGUF Files', extensions: ['gguf'] },
          { name: 'All Files', extensions: ['*'] },
        ],
        properties: ['openFile'],
      });

      if (result.canceled || result.filePaths.length === 0) {
        return null;
      }

      return result.filePaths[0];
    } catch (error) {
      console.warn('Error selecting model file:', error);
      return null;
    }
  }

  async getCurrentVersion(): Promise<InstalledVersion | null> {
    const versions = await this.getInstalledVersions();
    const currentBinaryPath = this.configManager.getCurrentKoboldBinary();

    if (currentBinaryPath) {
      const found = versions.find((v) => v.path === currentBinaryPath);
      if (found && existsSync(found.path)) {
        return found;
      }

      this.configManager.setCurrentKoboldBinary('');
    }

    return versions[0] || null;
  }

  async setCurrentVersion(version: string): Promise<boolean> {
    const versions = await this.getInstalledVersions();
    const targetVersion = versions.find((v) => v.version === version);

    if (targetVersion && existsSync(targetVersion.path)) {
      this.configManager.setCurrentKoboldBinary(targetVersion.path);
      return true;
    }

    return false;
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

          if (/^\d+\.\d+/.test(allOutput)) {
            const versionParts = allOutput.split(/\s+/)[0];
            if (versionParts && /^\d+\.\d+/.test(versionParts)) {
              resolve(versionParts);
              return;
            }
          }

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

        process.on('error', () => {
          resolve(null);
        });

        setTimeout(() => {
          try {
            process.kill('SIGTERM');
          } catch {
            // Process might already be dead
          }
          resolve(null);
        }, 10000);
      } catch {
        resolve(null);
      }
    });
  }

  getCurrentInstallDir() {
    return this.installDir;
  }

  getWindowManager() {
    return this.windowManager;
  }

  async selectInstallDirectory(): Promise<string | null> {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory', 'createDirectory'],
      title: DIALOG_TITLES.SELECT_INSTALL_DIR,
      defaultPath: this.installDir,
      buttonLabel: 'Select Directory',
    });

    if (!result.canceled && result.filePaths.length > 0) {
      this.installDir = result.filePaths[0];
      this.configManager.setInstallDir(result.filePaths[0]);

      const mainWindow = this.windowManager.getMainWindow();
      if (mainWindow) {
        mainWindow.webContents.send('install-dir-changed', result.filePaths[0]);
      }

      return result.filePaths[0];
    }

    return null;
  }

  async launchKobold(
    versionPath: string,
    args: string[] = [],
    onOutput?: (data: string) => void,
    onError?: (data: string) => void
  ): Promise<ChildProcess | null> {
    if (this.koboldProcess) {
      this.koboldProcess.kill();
      this.koboldProcess = null;
    }

    if (!existsSync(versionPath)) {
      throw new Error('Selected version file does not exist');
    }

    this.koboldProcess = spawn(versionPath, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    if (onOutput) {
      this.koboldProcess.stdout?.on('data', (data) => {
        onOutput(data.toString());
      });
    }

    if (onError) {
      this.koboldProcess.stderr?.on('data', (data) => {
        onError(data.toString());
      });
    }

    this.koboldProcess.on('close', () => {
      this.koboldProcess = null;
    });

    return this.koboldProcess;
  }

  async stopKobold(): Promise<boolean> {
    try {
      if (this.koboldProcess) {
        this.koboldProcess.kill();
        this.koboldProcess = null;
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  isRunning() {
    return this.koboldProcess !== null && !this.koboldProcess.killed;
  }

  async getROCmDownload(): Promise<{
    name: string;
    url: string;
    size: number;
    version?: string;
  } | null> {
    const platform = process.platform;
    if (platform !== 'linux') {
      return null;
    }

    const latestRelease = await this.githubService.getLatestRelease();
    const version = latestRelease?.tag_name?.replace(/^v/, '') || 'unknown';

    return {
      name: ROCM.BINARY_NAME,
      url: ROCM.DOWNLOAD_URL,
      size: ROCM.SIZE_BYTES,
      version,
    };
  }

  async downloadROCm(onProgress?: (progress: number) => void): Promise<{
    success: boolean;
    path?: string;
    error?: string;
  }> {
    try {
      const platform = process.platform;
      if (platform !== 'linux') {
        return {
          success: false,
          error: ROCM.ERROR_MESSAGE,
        };
      }

      const response = await fetch(ROCM.DOWNLOAD_URL);
      if (!response.ok) {
        return {
          success: false,
          error: `Failed to download: ${response.statusText}`,
        };
      }

      const totalBytes = ROCM.SIZE_BYTES;
      let downloadedBytes = 0;

      const reader = response.body?.getReader();
      if (!reader) {
        return {
          success: false,
          error: 'Failed to get response reader',
        };
      }

      const filePath = join(this.installDir, ROCM.BINARY_NAME);
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
          writer.on('finish', resolve);
          writer.on('error', reject);
        });
      } finally {
        reader.releaseLock();
      }

      // Make the binary executable on Unix-like systems (Linux/macOS)
      if (process.platform !== 'win32') {
        try {
          chmodSync(filePath, 0o755);
        } catch (error) {
          console.warn('Failed to make ROCm binary executable:', error);
        }
      }

      return {
        success: true,
        path: filePath,
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  async getInstalledVersion(): Promise<string | undefined> {
    const currentVersion = await this.getCurrentVersion();
    return currentVersion?.version;
  }

  async checkForUpdates(): Promise<UpdateInfo | null> {
    try {
      const currentVersion = await this.getCurrentVersion();
      if (!currentVersion) {
        return null;
      }

      const latestRelease = await this.githubService.getLatestRelease();
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
    } catch {
      return null;
    }
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

  async getLatestReleaseWithDownloadStatus(): Promise<ReleaseWithStatus | null> {
    try {
      const latestRelease = await this.githubService.getLatestRelease();
      if (!latestRelease) return null;

      const installedVersions = await this.getInstalledVersions();

      const availableAssets = latestRelease.assets.map((asset: GitHubAsset) => {
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
    } catch {
      return null;
    }
  }

  async launchKoboldCpp(
    args: string[] = [],
    configFilePath?: string
  ): Promise<{ success: boolean; pid?: number; error?: string }> {
    try {
      if (this.koboldProcess) {
        this.stopKoboldCpp();
      }

      const currentVersion = await this.getCurrentVersion();
      if (!currentVersion || !existsSync(currentVersion.path)) {
        return {
          success: false,
          error: 'KoboldCpp not found',
        };
      }

      const finalArgs = [...args]; // Start with the provided arguments

      if (configFilePath && existsSync(configFilePath)) {
        finalArgs.push('--config', configFilePath);
      }

      const child = spawn(currentVersion.path, finalArgs, {
        stdio: ['pipe', 'pipe', 'pipe'],
        detached: false,
      });

      this.koboldProcess = child;

      const mainWindow = this.windowManager.getMainWindow();
      if (mainWindow) {
        child.stdout?.on('data', (data) => {
          const output = data.toString();
          mainWindow.webContents.send('kobold-output', output);
        });

        child.stderr?.on('data', (data) => {
          const output = data.toString();
          mainWindow.webContents.send('kobold-output', output);
        });

        child.on('exit', (code, signal) => {
          const exitMessage = signal
            ? `\nProcess terminated with signal ${signal}\n`
            : `\nProcess exited with code ${code}\n`;
          mainWindow.webContents.send('kobold-output', exitMessage);
          this.koboldProcess = null;
        });

        child.on('error', (error) => {
          mainWindow.webContents.send(
            'kobold-output',
            `\nProcess error: ${error.message}\n`
          );
          this.koboldProcess = null;
        });
      }

      return { success: true, pid: child.pid };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  stopKoboldCpp(): void {
    if (this.koboldProcess) {
      try {
        // Try graceful termination first
        this.koboldProcess.kill('SIGTERM');

        // Force kill after 5 seconds if still running
        setTimeout(() => {
          if (this.koboldProcess && !this.koboldProcess.killed) {
            this.koboldProcess.kill('SIGKILL');
          }
        }, 5000);

        this.koboldProcess = null;
      } catch (error) {
        console.warn('Error stopping KoboldCpp process:', error);
        this.koboldProcess = null;
      }
    }
  }

  // Method to handle app termination - ensures process cleanup
  async cleanup(): Promise<void> {
    if (this.koboldProcess) {
      return new Promise((resolve) => {
        if (!this.koboldProcess) {
          resolve();
          return;
        }

        // Set up cleanup timeout
        const cleanup = () => {
          this.koboldProcess = null;
          resolve();
        };

        // Listen for process exit
        this.koboldProcess.once('exit', cleanup);
        this.koboldProcess.once('error', cleanup);

        // Try graceful shutdown
        this.koboldProcess.kill('SIGTERM');

        // Force kill after 3 seconds
        setTimeout(() => {
          if (this.koboldProcess && !this.koboldProcess.killed) {
            this.koboldProcess.kill('SIGKILL');
          }
          cleanup();
        }, 3000);
      });
    }
  }
}
