/* eslint-disable no-comments/disallowComments */
import { spawn, ChildProcess, exec as execCmd } from 'child_process';
import { join } from 'path';
import {
  existsSync,
  readdirSync,
  statSync,
  createWriteStream,
  chmodSync,
  readFileSync,
  writeFileSync,
  unlinkSync,
} from 'fs';
import { rm } from 'fs/promises';
import { dialog } from 'electron';
import { execa } from 'execa';
import { got } from 'got';
import { pipeline } from 'stream/promises';
import { ConfigManager } from '@/main/managers/ConfigManager';
import { LogManager } from '@/main/managers/LogManager';
import { WindowManager } from '@/main/managers/WindowManager';
import { ROCM, PRODUCT_NAME, GITHUB_API } from '@/constants';
import { stripAssetExtensions } from '@/utils/versionUtils';
import type {
  DownloadItem,
  GitHubAsset,
  InstalledVersion,
  KoboldConfig,
} from '@/types/electron';

export class KoboldCppManager {
  private installDir: string;
  private koboldProcess: ChildProcess | null = null;
  private configManager: ConfigManager;
  private logManager: LogManager;
  private windowManager: WindowManager;

  constructor(
    configManager: ConfigManager,
    windowManager: WindowManager,
    logManager: LogManager
  ) {
    this.configManager = configManager;
    this.logManager = logManager;
    this.windowManager = windowManager;
    this.installDir = this.configManager.getInstallDir() || '';
  }

  async downloadRelease(
    asset: GitHubAsset,
    onProgress?: (progress: number) => void
  ): Promise<string> {
    const tempPackedFilePath = join(this.installDir, `${asset.name}.packed`);
    const baseFilename = stripAssetExtensions(asset.name);
    const unpackedDirPath = join(this.installDir, baseFilename);

    if (asset.isUpdate && existsSync(unpackedDirPath)) {
      try {
        await rm(unpackedDirPath, { recursive: true, force: true });
      } catch (error) {
        this.logManager.logError(
          'Failed to remove existing directory for update:',
          error as Error
        );
      }
    }

    const writer = createWriteStream(tempPackedFilePath);
    let downloadedBytes = 0;
    const totalBytes = asset.size;

    try {
      await pipeline(
        got
          .stream(asset.browser_download_url)
          .on('downloadProgress', (progress) => {
            downloadedBytes = progress.transferred;
            if (onProgress && totalBytes > 0) {
              onProgress((downloadedBytes / totalBytes) * 100);
            }
          }),
        writer
      );
    } catch (error) {
      throw new Error(`Download failed: ${(error as Error).message}`);
    }

    if (process.platform !== 'win32') {
      try {
        chmodSync(tempPackedFilePath, 0o755);
      } catch (error) {
        this.logManager.logError(
          'Failed to make binary executable:',
          error as Error
        );
      }
    }

    try {
      await this.unpackKoboldCpp(tempPackedFilePath, unpackedDirPath);

      try {
        unlinkSync(tempPackedFilePath);
      } catch (error) {
        this.logManager.logError(
          'Failed to cleanup packed file:',
          error as Error
        );
      }

      const launcherPath = this.getLauncherPath(unpackedDirPath);
      if (launcherPath && existsSync(launcherPath)) {
        const currentBinary = this.configManager.getCurrentKoboldBinary();
        if (!currentBinary || (asset.isUpdate && asset.wasCurrentBinary)) {
          this.configManager.setCurrentKoboldBinary(launcherPath);
        }

        this.windowManager.sendToRenderer('versions-updated');

        return launcherPath;
      } else {
        throw new Error('Failed to find koboldcpp-launcher after unpacking');
      }
    } catch (error) {
      this.logManager.logError('Failed to unpack KoboldCpp:', error as Error);
      throw error;
    }
  }

  private async unpackKoboldCpp(
    packedPath: string,
    unpackDir: string
  ): Promise<void> {
    try {
      await execa(packedPath, ['--unpack', unpackDir], {
        timeout: 30000,
        stdio: ['ignore', 'pipe', 'pipe'],
      });
    } catch (error) {
      const execaError = error as {
        stderr?: string;
        stdout?: string;
        message: string;
      };
      const errorMessage =
        execaError.stderr || execaError.stdout || execaError.message;
      throw new Error(`Unpack failed: ${errorMessage}`);
    }
  }

  private getLauncherPath(unpackedDir: string): string | null {
    const extensions =
      process.platform === 'win32' ? ['.exe', ''] : ['', '.exe'];

    for (const ext of extensions) {
      const launcherPath = join(unpackedDir, `koboldcpp-launcher${ext}`);
      if (existsSync(launcherPath)) {
        return launcherPath;
      }
    }

    return null;
  }

  async getInstalledVersions(): Promise<InstalledVersion[]> {
    try {
      if (!existsSync(this.installDir)) {
        return [];
      }

      const items = readdirSync(this.installDir);
      const launchers: { path: string; filename: string; size: number }[] = [];

      for (const item of items) {
        const itemPath = join(this.installDir, item);
        const stats = statSync(itemPath);

        if (stats.isDirectory()) {
          const launcherPath = this.getLauncherPath(itemPath);
          if (launcherPath && existsSync(launcherPath)) {
            const launcherStats = statSync(launcherPath);
            const launcherFilename = launcherPath.split(/[/\\]/).pop() || '';
            launchers.push({
              path: launcherPath,
              filename: launcherFilename,
              size: launcherStats.size,
            });
          }
        }
      }

      const versionPromises = launchers.map(async (launcher) => {
        try {
          const detectedVersion = await this.getVersionFromBinary(
            launcher.path
          );
          const version = detectedVersion || 'unknown';

          return {
            version,
            path: launcher.path,
            filename: launcher.filename,
            size: launcher.size,
          } as InstalledVersion;
        } catch (error) {
          this.logManager.logError(
            `Could not detect version for ${launcher.filename}:`,
            error as Error
          );
          return null;
        }
      });

      const results = await Promise.all(versionPromises);
      return results.filter(
        (version): version is InstalledVersion => version !== null
      );
    } catch (error) {
      this.logManager.logError(
        'Error scanning install directory:',
        error as Error
      );
      return [];
    }
  }

  async getConfigFiles(): Promise<
    { name: string; path: string; size: number }[]
  > {
    const configFiles: { name: string; path: string; size: number }[] = [];

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
      this.logManager.logError(
        'Error scanning for config files:',
        error as Error
      );
    }

    return configFiles.sort((a, b) => a.name.localeCompare(b.name));
  }

  async parseConfigFile(filePath: string): Promise<KoboldConfig | null> {
    try {
      if (!existsSync(filePath)) {
        return null;
      }

      const content = readFileSync(filePath, 'utf-8');
      const config = JSON.parse(content);

      return config;
    } catch (error) {
      this.logManager.logError('Error parsing config file:', error as Error);
      return null;
    }
  }

  async saveConfigFile(
    configName: string,
    configData: KoboldConfig
  ): Promise<boolean> {
    try {
      if (!this.installDir) {
        this.logManager.logError('No install directory found');
        return false;
      }

      let configFileName = `${configName}.kcpps`;
      let configPath = join(this.installDir, configFileName);

      const kcpptPath = join(this.installDir, `${configName}.kcppt`);
      if (existsSync(kcpptPath)) {
        configFileName = `${configName}.kcppt`;
        configPath = kcpptPath;
      }

      writeFileSync(configPath, JSON.stringify(configData, null, 2), 'utf-8');
      return true;
    } catch (error) {
      this.logManager.logError('Error saving config file:', error as Error);
      return false;
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
      this.logManager.logError('Error selecting model file:', error as Error);
      return null;
    }
  }

  async getCurrentVersion(): Promise<InstalledVersion | null> {
    const currentBinaryPath = this.configManager.getCurrentKoboldBinary();
    const versions = await this.getInstalledVersions();

    if (currentBinaryPath && existsSync(currentBinaryPath)) {
      const currentVersion = versions.find((v) => v.path === currentBinaryPath);
      if (currentVersion) {
        return currentVersion;
      }
    }

    const firstVersion = versions[0];
    if (firstVersion) {
      this.configManager.setCurrentKoboldBinary(firstVersion.path);
      return firstVersion;
    }

    if (currentBinaryPath) {
      this.configManager.setCurrentKoboldBinary('');
    }

    return null;
  }

  async getCurrentBinaryInfo(): Promise<{
    path: string;
    filename: string;
  } | null> {
    const currentVersion = await this.getCurrentVersion();

    if (currentVersion) {
      const pathParts = currentVersion.path.split(/[/\\]/);
      const filename =
        pathParts[pathParts.length - 2] || currentVersion.filename;

      return {
        path: currentVersion.path,
        filename,
      };
    }

    return null;
  }

  async setCurrentVersion(binaryPath: string): Promise<boolean> {
    if (existsSync(binaryPath)) {
      this.configManager.setCurrentKoboldBinary(binaryPath);

      this.windowManager.sendToRenderer('versions-updated');

      return true;
    }

    return false;
  }

  async getVersionFromBinary(binaryPath: string): Promise<string | null> {
    try {
      if (!existsSync(binaryPath)) {
        return null;
      }

      const result = await execa(binaryPath, ['--version'], {
        timeout: 10000,
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      const allOutput = (result.stdout + result.stderr).trim();

      if (/^\d+\.\d+/.test(allOutput)) {
        const versionParts = allOutput.split(/\s+/)[0];
        if (versionParts && /^\d+\.\d+/.test(versionParts)) {
          return versionParts;
        }
      }

      const lines = allOutput.split('\n');
      for (const line of lines) {
        const trimmedLine = line.trim();
        if (/^\d+\.\d+/.test(trimmedLine)) {
          const versionPart = trimmedLine.split(/\s+/)[0];
          if (versionPart) {
            return versionPart;
          }
        }
      }

      return null;
    } catch {
      return null;
    }
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
      title: `Select the ${PRODUCT_NAME} Installation Directory`,
      defaultPath: this.installDir,
      buttonLabel: 'Select Directory',
    });

    if (!result.canceled && result.filePaths.length > 0) {
      this.installDir = result.filePaths[0];
      this.configManager.setInstallDir(result.filePaths[0]);

      this.windowManager.sendToRenderer(
        'install-dir-changed',
        result.filePaths[0]
      );

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
      stdio: ['pipe', 'pipe', 'pipe'],
      detached: false,
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

  async getROCmDownload(): Promise<DownloadItem | null> {
    const platform = process.platform;

    if (platform === 'linux') {
      try {
        const response = await fetch(GITHUB_API.LATEST_RELEASE_URL);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const latestRelease = await response.json();
        const version = latestRelease?.tag_name?.replace(/^v/, '') || 'unknown';

        return {
          name: ROCM.BINARY_NAME,
          url: ROCM.DOWNLOAD_URL,
          size: ROCM.SIZE_BYTES_APPROX,
          version,
          type: 'rocm',
        };
      } catch (error) {
        this.logManager.logError(
          'Failed to fetch ROCm version info:',
          error as Error
        );
        return {
          name: ROCM.BINARY_NAME,
          url: ROCM.DOWNLOAD_URL,
          size: ROCM.SIZE_BYTES_APPROX,
          version: 'unknown',
          type: 'rocm',
        };
      }
    } else if (platform === 'win32') {
      return null;
      // The launcher doesn't exist in unpacked state yet.
      // Enable when it's ready.
      // try {
      //   const response = await fetch(GITHUB_API.ROCM_LATEST_RELEASE_URL);
      //   if (!response.ok) {
      //     return null;
      //   }

      //   const release = await response.json();
      //   const rocmAsset = release.assets?.find((asset: GitHubAsset) =>
      //     asset.name.endsWith('rocm.exe')
      //   );

      //   if (rocmAsset) {
      //     return {
      //       name: rocmAsset.name,
      //       url: rocmAsset.browser_download_url,
      //       size: rocmAsset.size,
      //       version: release.tag_name?.replace(/^v/, '') || 'unknown',
      //       type: 'rocm',
      //     };
      //   }
      // } catch (error) {
      //   this.logManager.logError(
      //     'Failed to fetch Windows ROCm release:',
      //     error as Error
      //   );
      // }
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

      const tempPackedFilePath = join(
        this.installDir,
        `${rocmInfo.name}.packed`
      );
      const baseFilename = stripAssetExtensions(rocmInfo.name);
      const unpackedDirPath = join(this.installDir, baseFilename);

      const response = await fetch(rocmInfo.url);
      if (!response.ok) {
        return {
          success: false,
          error: `Failed to download: ${response.statusText}`,
        };
      }

      const writer = createWriteStream(tempPackedFilePath);
      let downloadedBytes = 0;
      const totalBytes = rocmInfo.size;

      try {
        await pipeline(
          got.stream(rocmInfo.url).on('downloadProgress', (progress) => {
            downloadedBytes = progress.transferred;
            if (onProgress && totalBytes > 0) {
              onProgress((downloadedBytes / totalBytes) * 100);
            }
          }),
          writer
        );
      } catch (error) {
        return {
          success: false,
          error: `Download failed: ${(error as Error).message}`,
        };
      }

      if (process.platform !== 'win32') {
        try {
          chmodSync(tempPackedFilePath, 0o755);
        } catch (error) {
          this.logManager.logError(
            'Failed to make ROCm binary executable:',
            error as Error
          );
        }
      }

      try {
        await this.unpackKoboldCpp(tempPackedFilePath, unpackedDirPath);

        try {
          unlinkSync(tempPackedFilePath);
        } catch (error) {
          this.logManager.logError(
            'Failed to cleanup packed ROCm file:',
            error as Error
          );
        }

        const launcherPath = this.getLauncherPath(unpackedDirPath);
        if (launcherPath && existsSync(launcherPath)) {
          const currentBinary = this.configManager.getCurrentKoboldBinary();
          if (!currentBinary) {
            this.configManager.setCurrentKoboldBinary(launcherPath);
          }

          this.windowManager.sendToRenderer('versions-updated');

          return {
            success: true,
            path: launcherPath,
          };
        } else {
          return {
            success: false,
            error: 'Failed to find koboldcpp-launcher after unpacking ROCm',
          };
        }
      } catch (error) {
        this.logManager.logError('Failed to unpack ROCm:', error as Error);
        return {
          success: false,
          error: `Failed to unpack ROCm: ${(error as Error).message}`,
        };
      }
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

  async launchKoboldCpp(
    args: string[] = []
  ): Promise<{ success: boolean; pid?: number; error?: string }> {
    try {
      if (this.koboldProcess) {
        this.stopKoboldCpp();
      }

      const currentVersion = await this.getCurrentVersion();
      if (!currentVersion || !existsSync(currentVersion.path)) {
        const error = 'KoboldCpp not found';
        this.logManager.logError(
          `Launch failed: ${error}. Current version: ${JSON.stringify(currentVersion)}`
        );
        return {
          success: false,
          error,
        };
      }

      const finalArgs = [...args];

      const child = spawn(currentVersion.path, finalArgs, {
        stdio: ['pipe', 'pipe', 'pipe'],
        detached: false,
      });

      this.koboldProcess = child;

      const commandLine = `$ ${currentVersion.path} ${finalArgs.join(' ')}`;

      setTimeout(() => {
        this.windowManager.sendKoboldOutput(commandLine);
      }, 200);

      child.stdout?.on('data', (data) => {
        const output = data.toString();
        this.windowManager.sendKoboldOutput(output, true);
      });

      child.stderr?.on('data', (data) => {
        const output = data.toString();
        this.windowManager.sendKoboldOutput(output, true);
      });

      child.on('exit', (code, signal) => {
        const displayMessage = signal
          ? `\n[INFO] Process terminated with signal ${signal}`
          : code === 0
            ? `\n[INFO] Process exited successfully`
            : code && (code > 1 || code < 0)
              ? `\n[ERROR] Process exited with code ${code}`
              : `\n[INFO] Process exited with code ${code}`;
        this.windowManager.sendKoboldOutput(displayMessage);
        this.koboldProcess = null;
      });

      child.on('error', (error) => {
        this.logManager.logError(
          `KoboldCpp process error: ${error.message}`,
          error
        );

        this.windowManager.sendKoboldOutput(
          `\n[ERROR] Process error: ${error.message}\n`
        );
        this.koboldProcess = null;
      });

      return { success: true, pid: child.pid };
    } catch (error) {
      const errorMessage = (error as Error).message;
      this.logManager.logError(
        `Failed to launch KoboldCpp: ${errorMessage}`,
        error as Error
      );
      return { success: false, error: errorMessage };
    }
  }

  stopKoboldCpp(): void {
    if (this.koboldProcess) {
      const pid = this.koboldProcess.pid;

      try {
        this.koboldProcess.kill('SIGTERM');

        setTimeout(() => {
          if (this.koboldProcess && !this.koboldProcess.killed) {
            try {
              this.koboldProcess.kill('SIGKILL');
            } catch (error) {
              this.logManager.logError(
                'Error force-killing KoboldCpp process:',
                error as Error
              );
            }
          }
        }, 5000);

        this.koboldProcess = null;
      } catch (error) {
        this.logManager.logError(
          `Error sending SIGTERM to KoboldCpp process (PID: ${pid}):`,
          error as Error
        );
        this.koboldProcess = null;
      }
    }
  }

  async cleanup(): Promise<void> {
    if (this.koboldProcess) {
      await new Promise<void>((resolve) => {
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
          if (process.platform === 'win32') {
            const pid = this.koboldProcess.pid;
            if (pid) {
              try {
                this.koboldProcess.kill('SIGTERM');

                setTimeout(() => {
                  if (this.koboldProcess && !this.koboldProcess.killed) {
                    execCmd(
                      `taskkill /pid ${pid} /t /f`,
                      (error: Error | null) => {
                        if (error) {
                          this.logManager.logError(
                            'Error force-killing process:',
                            error
                          );
                        }
                        cleanup();
                      }
                    );
                  } else {
                    cleanup();
                  }
                }, 2000);
              } catch (error) {
                this.logManager.logError(
                  'Error during Windows cleanup:',
                  error as Error
                );
                cleanup();
              }
            } else {
              cleanup();
            }
          } else {
            // Unix-like systems
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
          }
        } catch (error) {
          this.logManager.logError('Error during cleanup:', error as Error);
          cleanup();
        }
      });
    }
  }
}
