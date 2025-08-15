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
import { ROCM, GITHUB_API } from '@/constants';

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
  size?: number;
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
    this.installDir = this.configManager.getInstallDir() || '';
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

  async getInstalledVersions(
    includeVersions = true
  ): Promise<InstalledVersion[]> {
    try {
      if (!existsSync(this.installDir)) {
        return [];
      }

      const files = readdirSync(this.installDir);
      const koboldFiles = files.filter((file) => {
        const filePath = join(this.installDir, file);
        try {
          const stats = statSync(filePath);

          if (stats.isFile() && file.startsWith('koboldcpp')) {
            if (process.platform !== 'win32') {
              const isExecutable = (stats.mode & parseInt('111', 8)) !== 0;
              return isExecutable;
            } else {
              return true;
            }
          }
          return false;
        } catch {
          return false;
        }
      });

      if (!includeVersions) {
        return koboldFiles.map((file) => {
          const filePath = join(this.installDir, file);
          const stats = statSync(filePath);
          return {
            version: 'unknown',
            path: filePath,
            filename: file,
            size: stats.size,
          };
        });
      }

      const versionPromises = koboldFiles.map(async (file) => {
        const filePath = join(this.installDir, file);

        try {
          const stats = statSync(filePath);
          const detectedVersion = await this.getVersionFromBinary(filePath);
          const version = detectedVersion || 'unknown';

          return {
            version,
            path: filePath,
            filename: file,
            size: stats.size,
          } as InstalledVersion;
        } catch (error) {
          console.warn(`Could not detect version for ${file}:`, error);
          return null;
        }
      });

      const results = await Promise.all(versionPromises);
      return results.filter(
        (version): version is InstalledVersion => version !== null
      );
    } catch (error) {
      console.warn('Error scanning install directory:', error);
      return [];
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
    const currentBinaryPath = this.configManager.getCurrentKoboldBinary();

    if (currentBinaryPath && existsSync(currentBinaryPath)) {
      try {
        const filename = currentBinaryPath.split(/[/\\]/).pop() || '';
        const version =
          (await this.getVersionFromBinary(currentBinaryPath)) || 'unknown';

        return {
          version,
          path: currentBinaryPath,
          filename,
        };
      } catch (error) {
        console.warn('Failed to get current version info:', error);
        this.configManager.setCurrentKoboldBinary('');
      }
    }

    const versions = await this.getInstalledVersions();
    const firstVersion = versions[0];

    if (firstVersion) {
      this.configManager.setCurrentKoboldBinary(firstVersion.path);
      return firstVersion;
    }

    return null;
  }

  async setCurrentVersion(binaryPath: string): Promise<boolean> {
    if (existsSync(binaryPath)) {
      this.configManager.setCurrentKoboldBinary(binaryPath);
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
            void 0;
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
      title: 'Select the Friendly Kobold Installation Directory',
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

    if (platform === 'linux') {
      const latestRelease = await this.githubService.getLatestRelease();
      const version = latestRelease?.tag_name?.replace(/^v/, '') || 'unknown';

      return {
        name: ROCM.BINARY_NAME,
        url: ROCM.DOWNLOAD_URL,
        size: ROCM.SIZE_BYTES,
        version,
      };
    } else if (platform === 'win32') {
      try {
        const response = await fetch(GITHUB_API.ROCM_LATEST_RELEASE_URL);
        if (!response.ok) {
          return null;
        }

        const release = await response.json();
        const rocmAsset = release.assets?.find(
          (asset: GitHubAsset) =>
            asset.name.endsWith('rocm.exe') &&
            !asset.name.includes('rocm_b2.exe')
        );

        if (rocmAsset) {
          return {
            name: rocmAsset.name,
            url: rocmAsset.browser_download_url,
            size: rocmAsset.size,
            version: release.tag_name?.replace(/^v/, '') || 'unknown',
          };
        }
      } catch (error) {
        console.warn('Failed to fetch Windows ROCm release:', error);
      }
    }

    return null;
  }

  async downloadROCm(onProgress?: (progress: number) => void): Promise<{
    success: boolean;
    path?: string;
    error?: string;
  }> {
    try {
      const rocmInfo = await this.getROCmDownload();
      if (!rocmInfo) {
        return {
          success: false,
          error: 'ROCm version not available for this platform',
        };
      }

      const response = await fetch(rocmInfo.url);
      if (!response.ok) {
        return {
          success: false,
          error: `Failed to download: ${response.statusText}`,
        };
      }

      const totalBytes = rocmInfo.size;
      let downloadedBytes = 0;

      const reader = response.body?.getReader();
      if (!reader) {
        return {
          success: false,
          error: 'Failed to get response reader',
        };
      }

      const filePath = join(this.installDir, rocmInfo.name);
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

      const finalArgs = [...args];

      if (configFilePath && existsSync(configFilePath)) {
        finalArgs.push('--config', configFilePath);
      }

      const child = spawn(currentVersion.path, finalArgs, {
        stdio: ['pipe', 'pipe', 'pipe'],
        detached: false,
      });

      this.koboldProcess = child;

      const mainWindow = this.windowManager.getMainWindow();
      if (mainWindow && !mainWindow.isDestroyed()) {
        const commandLine = `$ ${currentVersion.path} ${finalArgs.join(' ')}\n${'─'.repeat(60)}\n`;

        setTimeout(() => {
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('kobold-output', commandLine);
          }
        }, 200);

        child.stdout?.on('data', (data) => {
          if (mainWindow && !mainWindow.isDestroyed()) {
            const output = data.toString();
            mainWindow.webContents.send('kobold-output', output);
          }
        });

        child.stderr?.on('data', (data) => {
          if (mainWindow && !mainWindow.isDestroyed()) {
            const output = data.toString();
            mainWindow.webContents.send('kobold-output', output);
          }
        });

        child.on('exit', (code, signal) => {
          if (mainWindow && !mainWindow.isDestroyed()) {
            const exitMessage = signal
              ? `\nProcess terminated with signal ${signal}\n`
              : `\nProcess exited with code ${code}\n`;
            mainWindow.webContents.send('kobold-output', exitMessage);
          }
          this.koboldProcess = null;
        });

        child.on('error', (error) => {
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send(
              'kobold-output',
              `\nProcess error: ${error.message}\n`
            );
          }
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
        this.koboldProcess.kill('SIGTERM');

        setTimeout(() => {
          if (this.koboldProcess && !this.koboldProcess.killed) {
            try {
              this.koboldProcess.kill('SIGKILL');
            } catch (error) {
              console.warn('Error force-killing KoboldCpp process:', error);
            }
          }
        }, 5000);

        this.koboldProcess = null;
      } catch (error) {
        console.warn('Error stopping KoboldCpp process:', error);
        this.koboldProcess = null;
      }
    }
  }

  async cleanup(): Promise<void> {
    if (this.koboldProcess) {
      return new Promise((resolve) => {
        if (!this.koboldProcess) {
          resolve();
          return;
        }

        const cleanup = () => {
          this.koboldProcess = null;
          resolve();
        };

        this.koboldProcess.once('exit', cleanup);
        this.koboldProcess.once('error', cleanup);

        try {
          this.koboldProcess.kill('SIGTERM');

          setTimeout(() => {
            if (this.koboldProcess && !this.koboldProcess.killed) {
              try {
                this.koboldProcess.kill('SIGKILL');
              } catch {
                void 0;
              }
            }
            cleanup();
          }, 3000);
        } catch (error) {
          console.warn('Error during cleanup:', error);
          cleanup();
        }
      });
    }
  }
}
