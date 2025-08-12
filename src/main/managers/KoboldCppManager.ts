import { spawn, ChildProcess } from 'child_process';
import { join } from 'path';
import { existsSync, readdirSync, statSync, createWriteStream } from 'fs';
import { dialog } from 'electron';
import { GitHubService } from '../services/GitHubService';
import { ConfigManager } from './ConfigManager';

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
  type: 'github' | 'rocm';
  downloadDate: string;
  filename: string;
}

export class KoboldCppManager {
  private installDir: string;
  private koboldProcess: ChildProcess | null = null;
  private configManager: ConfigManager;
  private githubService: GitHubService;

  constructor(configManager: ConfigManager, githubService: GitHubService) {
    this.configManager = configManager;
    this.githubService = githubService;
    this.installDir =
      this.configManager.getInstallDir() ||
      join(process.env.HOME || process.env.USERPROFILE || '.', 'KoboldCpp');
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

    return filePath;
  }

  async getInstalledVersions(): Promise<InstalledVersion[]> {
    const configData = this.configManager.get('installedVersions');
    const configVersions: InstalledVersion[] = Array.isArray(configData)
      ? (configData as unknown as InstalledVersion[])
      : [];
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
              (v: InstalledVersion) => v.path === filePath
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
      return configVersions.filter((version: InstalledVersion) =>
        existsSync(version.path)
      );
    }

    if (
      scannedVersions.length !== configVersions.length ||
      !scannedVersions.every((sv) =>
        configVersions.some((cv: InstalledVersion) => cv.path === sv.path)
      )
    ) {
      this.configManager.set('installedVersions', scannedVersions as unknown[]);
    }

    return scannedVersions;
  }

  async isInstalled(): Promise<boolean> {
    const versions = await this.getInstalledVersions();
    return versions.some((version) => existsSync(version.path));
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

  async getCurrentVersion(): Promise<InstalledVersion | null> {
    const versions = await this.getInstalledVersions();
    const currentVersionString = this.configManager.getCurrentVersion();

    if (currentVersionString) {
      const found =
        versions.find((v) => v.version === currentVersionString) || null;
      return found;
    }

    const fallback =
      versions.sort(
        (a, b) =>
          new Date(b.downloadDate).getTime() -
          new Date(a.downloadDate).getTime()
      )[0] || null;
    return fallback;
  }

  async setCurrentVersion(version: string): Promise<boolean> {
    const versions = await this.getInstalledVersions();
    const targetVersion = versions.find((v) => v.version === version);

    if (!targetVersion || !existsSync(targetVersion.path)) {
      if (targetVersion) {
        const updatedVersions = versions.filter((v) => v.version !== version);
        this.configManager.set(
          'installedVersions',
          updatedVersions as unknown[]
        );
      }
      return false;
    }

    this.configManager.setCurrentVersion(version);

    const installedVersionsData = this.configManager.get('installedVersions');
    const installedVersions: InstalledVersion[] = Array.isArray(
      installedVersionsData
    )
      ? (installedVersionsData as unknown as InstalledVersion[])
      : [];
    const versionToUpdate = installedVersions.find(
      (v: InstalledVersion) => v.version === version
    );

    if (versionToUpdate) {
      this.configManager.set(
        'installedVersions',
        installedVersions as unknown[]
      );
    }

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

  async selectInstallDirectory(): Promise<string | null> {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory', 'createDirectory'],
      title: 'Select KoboldCpp Installation Directory',
      defaultPath: this.installDir,
    });

    if (!result.canceled && result.filePaths.length > 0) {
      const newPath = join(result.filePaths[0], 'KoboldCpp');
      this.installDir = newPath;
      this.configManager.setInstallDir(newPath);
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

    const filteredVersions = versions.filter((v) => v.version !== version);
    const filename = path.split(/[/\\]/).pop() || 'unknown';

    const newVersion: InstalledVersion = {
      version,
      path,
      type,
      downloadDate: new Date().toISOString(),
      filename,
    };

    this.configManager.set('installedVersions', [
      ...filteredVersions,
      newVersion,
    ] as unknown[]);
    this.configManager.setCurrentVersion(version);
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
    type: 'rocm';
    version?: string;
  } | null> {
    const platform = process.platform;
    if (platform !== 'linux') {
      return null;
    }

    const latestRelease = await this.githubService.getLatestRelease();
    const version = latestRelease?.tag_name?.replace(/^v/, '') || 'unknown';

    return {
      name: 'koboldcpp-linux-x64-rocm',
      url: 'https://koboldai.org/cpplinuxrocm',
      size: 1024 * 1024 * 1024,
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

      const filePath = join(this.installDir, 'koboldcpp-linux-x64-rocm');
      const writer = createWriteStream(filePath);

      response.body?.pipeTo(
        new WritableStream({
          write(chunk) {
            writer.write(chunk);
          },
          close() {
            writer.end();
          },
        })
      );

      await new Promise<void>((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
      });

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

  async openInstallDialog(): Promise<{
    success: boolean;
    version?: string;
    path?: string;
    error?: string;
  }> {
    try {
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
        const detectedVersion = await this.getVersionFromBinary(filePath);
        const version = detectedVersion || 'unknown';

        await this.addInstalledVersion(version, filePath);

        return {
          success: true,
          version,
          path: filePath,
        };
      }

      return { success: false, error: 'No file selected' };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  async launchKoboldCpp(
    args: string[] = []
  ): Promise<{ success: boolean; pid?: number; error?: string }> {
    try {
      const currentVersion = await this.getCurrentVersion();
      if (!currentVersion || !existsSync(currentVersion.path)) {
        return {
          success: false,
          error: 'KoboldCpp not found or no version selected',
        };
      }

      const child = spawn(currentVersion.path, args, {
        detached: true,
        stdio: 'ignore',
      });

      await this.setCurrentVersion(currentVersion.version);
      child.unref();

      return { success: true, pid: child.pid };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }
}
