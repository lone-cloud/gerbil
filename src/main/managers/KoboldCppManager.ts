import { spawn, ChildProcess } from 'child_process';
import { createWriteStream } from 'fs';
import { join } from 'path';
import { rm, readdir, stat, unlink, rename, mkdir, chmod } from 'fs/promises';
import { dialog } from 'electron';
import axios from 'axios';

import { execa } from 'execa';
import { terminateProcess } from '@/utils/process';
import { ConfigManager } from '@/main/managers/ConfigManager';
import { LogManager } from '@/main/managers/LogManager';
import { WindowManager } from '@/main/managers/WindowManager';
import { PRODUCT_NAME, SERVER_READY_SIGNALS } from '@/constants';
import { pathExists, readJsonFile, writeJsonFile } from '@/utils/fs';
import { stripAssetExtensions } from '@/utils/version';
import type {
  GitHubAsset,
  InstalledVersion,
  KoboldConfig,
} from '@/types/electron';

export class KoboldCppManager {
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
  }

  private async removeDirectoryWithRetry(
    dirPath: string,
    maxRetries = 3,
    delayMs = 1000
  ): Promise<void> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await rm(dirPath, { recursive: true, force: true });
        return;
      } catch (error) {
        const isLastAttempt = attempt === maxRetries;
        const isPermissionError =
          (error as Error & { code?: string }).code === 'EPERM';

        if (isLastAttempt) {
          throw error;
        }

        if (isPermissionError && process.platform === 'win32') {
          this.windowManager.sendKoboldOutput(
            `Attempt ${attempt}/${maxRetries} failed (file in use), retrying in ${delayMs}ms...`
          );
          await new Promise((resolve) => setTimeout(resolve, delayMs));
          delayMs *= 1.5;
        } else {
          throw error;
        }
      }
    }
  }

  private async handleExistingDirectory(
    unpackedDirPath: string,
    isUpdate: boolean
  ): Promise<void> {
    if (!isUpdate || !(await pathExists(unpackedDirPath))) {
      return;
    }

    try {
      if (this.koboldProcess && !this.koboldProcess.killed) {
        this.windowManager.sendKoboldOutput(
          'Stopping process before update...'
        );
        await this.cleanup();
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }

      await this.removeDirectoryWithRetry(unpackedDirPath);
    } catch (error) {
      this.logManager.logError(
        'Failed to remove existing directory for update:',
        error as Error
      );
      throw new Error(
        `Cannot update: Failed to remove existing installation. ` +
          `Please ensure the server is stopped and try again. ` +
          `Error: ${(error as Error).message}`
      );
    }
  }

  private async downloadFile(
    asset: GitHubAsset,
    tempPackedFilePath: string
  ): Promise<void> {
    const writer = createWriteStream(tempPackedFilePath);
    let downloadedBytes = 0;

    const response = await axios({
      method: 'GET',
      url: asset.browser_download_url,
      responseType: 'stream',
      timeout: 30000,
      maxRedirects: 5,
    });

    const totalBytes = asset.size;

    response.data.on('data', (chunk: Buffer) => {
      downloadedBytes += chunk.length;
      if (totalBytes > 0) {
        const progress = (downloadedBytes / totalBytes) * 100;
        const mainWindow = this.windowManager.getMainWindow();
        if (mainWindow) {
          mainWindow.webContents.send('download-progress', progress);
        }
      }
    });

    response.data.pipe(writer);

    await new Promise<void>((resolve, reject) => {
      writer.on('finish', async () => {
        if (process.platform !== 'win32') {
          try {
            await chmod(tempPackedFilePath, 0o755);
          } catch (error) {
            this.logManager.logError(
              'Failed to make binary executable:',
              error as Error
            );
          }
        }
        resolve();
      });
      writer.on('error', reject);
      response.data.on('error', reject);
    });
  }

  private async setupLauncher(
    tempPackedFilePath: string,
    unpackedDirPath: string
  ): Promise<string> {
    let launcherPath = await this.getLauncherPath(unpackedDirPath);

    if (!launcherPath || !(await pathExists(launcherPath))) {
      const expectedLauncherName =
        process.platform === 'win32'
          ? 'koboldcpp-launcher.exe'
          : 'koboldcpp-launcher';
      const newLauncherPath = join(unpackedDirPath, expectedLauncherName);

      if (await pathExists(tempPackedFilePath)) {
        try {
          await rename(tempPackedFilePath, newLauncherPath);
          launcherPath = newLauncherPath;
        } catch (error) {
          this.logManager.logError(
            'Failed to rename binary as launcher:',
            error as Error
          );
        }
      }
    } else {
      try {
        await unlink(tempPackedFilePath);
      } catch (error) {
        this.logManager.logError(
          'Failed to cleanup packed file:',
          error as Error
        );
      }
    }

    if (!launcherPath || !(await pathExists(launcherPath))) {
      throw new Error('Failed to find or create launcher');
    }

    return launcherPath;
  }

  async downloadRelease(asset: GitHubAsset): Promise<string> {
    const tempPackedFilePath = join(
      this.configManager.getInstallDir(),
      `${asset.name}.packed`
    );
    const baseFilename = stripAssetExtensions(asset.name);
    const folderName = asset.version
      ? `${baseFilename}-${asset.version}`
      : baseFilename;
    const unpackedDirPath = join(
      this.configManager.getInstallDir(),
      folderName
    );

    try {
      await this.handleExistingDirectory(
        unpackedDirPath,
        Boolean(asset.isUpdate)
      );
      await this.downloadFile(asset, tempPackedFilePath);
      await mkdir(unpackedDirPath, { recursive: true });
      await this.unpackKoboldCpp(tempPackedFilePath, unpackedDirPath);
      const launcherPath = await this.setupLauncher(
        tempPackedFilePath,
        unpackedDirPath
      );

      const currentBinary = this.configManager.getCurrentKoboldBinary();
      if (!currentBinary || (asset.isUpdate && asset.wasCurrentBinary)) {
        await this.configManager.setCurrentKoboldBinary(launcherPath);
      }

      this.windowManager.sendToRenderer('versions-updated');
      return launcherPath;
    } catch (error) {
      this.logManager.logError(
        'Failed to download or unpack binary:',
        error as Error
      );
      throw new Error(
        `Failed to download or unpack binary: ${(error as Error).message}`
      );
    }
  }

  private async unpackKoboldCpp(
    packedPath: string,
    unpackDir: string
  ): Promise<void> {
    try {
      await execa(packedPath, ['--unpack', unpackDir], {
        timeout: 60000,
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

  private async getLauncherPath(unpackedDir: string): Promise<string | null> {
    const extensions =
      process.platform === 'win32' ? ['.exe', ''] : ['', '.exe'];

    for (const ext of extensions) {
      const launcherPath = join(unpackedDir, `koboldcpp-launcher${ext}`);
      if (await pathExists(launcherPath)) {
        return launcherPath;
      }
    }

    return null;
  }

  async getInstalledVersions(): Promise<InstalledVersion[]> {
    try {
      const installDir = this.configManager.getInstallDir();
      if (!(await pathExists(installDir))) {
        return [];
      }

      const items = await readdir(installDir);
      const launchers: { path: string; filename: string; size: number }[] = [];

      for (const item of items) {
        const itemPath = join(installDir, item);
        const stats = await stat(itemPath);

        if (stats.isDirectory()) {
          const launcherPath = await this.getLauncherPath(itemPath);
          if (launcherPath && (await pathExists(launcherPath))) {
            const launcherStats = await stat(launcherPath);
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
      const installDir = this.configManager.getInstallDir();
      if (await pathExists(installDir)) {
        const files = await readdir(installDir);

        for (const file of files) {
          const filePath = join(installDir, file);

          const stats = await stat(filePath);
          if (
            stats.isFile() &&
            (file.endsWith('.kcpps') ||
              file.endsWith('.kcppt') ||
              file.endsWith('.json'))
          ) {
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
      if (!(await pathExists(filePath))) {
        return null;
      }

      const config = await readJsonFile(filePath);
      return config as KoboldConfig;
    } catch (error) {
      this.logManager.logError('Error parsing config file:', error as Error);
      return null;
    }
  }

  async saveConfigFile(
    configFileName: string,
    configData: KoboldConfig
  ): Promise<boolean> {
    try {
      const installDir = this.configManager.getInstallDir();
      const configPath = join(installDir, configFileName);
      await writeJsonFile(configPath, configData);
      return true;
    } catch (error) {
      this.logManager.logError('Error saving config file:', error as Error);
      return false;
    }
  }

  async selectModelFile(title = 'Select Model File'): Promise<string | null> {
    try {
      const mainWindow = this.windowManager.getMainWindow();
      if (!mainWindow) {
        return null;
      }

      const result = await dialog.showOpenDialog(mainWindow, {
        title,
        filters: [
          {
            name: 'Model Files',
            extensions: ['gguf', 'safetensors'],
          },
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

    if (currentBinaryPath && (await pathExists(currentBinaryPath))) {
      const currentVersion = versions.find((v) => v.path === currentBinaryPath);
      if (currentVersion) {
        return currentVersion;
      }
    }

    const firstVersion = versions[0];
    if (firstVersion) {
      await this.configManager.setCurrentKoboldBinary(firstVersion.path);
      return firstVersion;
    }

    if (currentBinaryPath) {
      await this.configManager.setCurrentKoboldBinary('');
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
    if (await pathExists(binaryPath)) {
      await this.configManager.setCurrentKoboldBinary(binaryPath);

      this.windowManager.sendToRenderer('versions-updated');

      return true;
    }

    return false;
  }

  async getVersionFromBinary(launcherPath: string): Promise<string | null> {
    try {
      if (!(await pathExists(launcherPath))) {
        return null;
      }

      const folderName = launcherPath.split(/[/\\]/).slice(-2, -1)[0];
      if (folderName) {
        const versionMatch = folderName.match(
          /-(\d+\.\d+(?:\.\d+)?(?:\.[a-zA-Z0-9]+)*(?:-[a-zA-Z0-9]+)*)$/
        );
        if (versionMatch) {
          return versionMatch[1];
        }
      }

      const result = await execa(launcherPath, ['--version'], {
        timeout: 30000,
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
    return this.configManager.getInstallDir();
  }

  getWindowManager() {
    return this.windowManager;
  }

  async selectInstallDirectory(): Promise<string | null> {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory', 'createDirectory'],
      title: `Select the ${PRODUCT_NAME} Installation Directory`,
      defaultPath: this.configManager.getInstallDir(),
      buttonLabel: 'Select Directory',
    });

    if (!result.canceled && result.filePaths.length > 0) {
      await this.configManager.setInstallDir(result.filePaths[0]);

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

    if (!(await pathExists(versionPath))) {
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

  async getInstalledVersion(): Promise<string | undefined> {
    const currentVersion = await this.getCurrentVersion();
    return currentVersion?.version;
  }

  async launchKoboldCpp(
    args: string[] = []
  ): Promise<{ success: boolean; pid?: number; error?: string }> {
    try {
      if (this.koboldProcess) {
        await this.stopKoboldCpp();
      }

      const currentVersion = await this.getCurrentVersion();
      if (!currentVersion || !(await pathExists(currentVersion.path))) {
        const rawPath = this.configManager.getCurrentKoboldBinary();
        const error = currentVersion
          ? `Binary file does not exist at path: ${currentVersion.path}`
          : 'No version configured';

        this.logManager.logError(
          `Launch failed: ${error}. Raw config path: "${rawPath}", Current version: ${JSON.stringify(currentVersion)}`
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

      let readyResolve:
        | ((value: { success: boolean; pid?: number; error?: string }) => void)
        | null = null;
      let _readyReject: ((error: Error) => void) | null = null;
      let isReady = false;

      const readyPromise = new Promise<{
        success: boolean;
        pid?: number;
        error?: string;
      }>((resolve, reject) => {
        readyResolve = resolve;
        _readyReject = reject;
      });

      child.stdout?.on('data', (data) => {
        const output = data.toString();
        this.windowManager.sendKoboldOutput(output, true);

        if (!isReady && output.includes(SERVER_READY_SIGNALS.KOBOLDCPP)) {
          isReady = true;
          readyResolve?.({ success: true, pid: child.pid });
        }
      });

      child.stderr?.on('data', (data) => {
        const output = data.toString();
        this.windowManager.sendKoboldOutput(output, true);

        if (!isReady && output.includes(SERVER_READY_SIGNALS.KOBOLDCPP)) {
          isReady = true;
          readyResolve?.({ success: true, pid: child.pid });
        }
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

        if (!isReady) {
          _readyReject?.(
            new Error(
              `Process exited before ready signal (code: ${code}, signal: ${signal})`
            )
          );
        }
      });

      child.on('error', (error) => {
        this.logManager.logError(`Process error: ${error.message}`, error);

        this.windowManager.sendKoboldOutput(
          `\n[ERROR] Process error: ${error.message}\n`
        );
        this.koboldProcess = null;

        if (!isReady) {
          _readyReject?.(error);
        }
      });

      return readyPromise;
    } catch (error) {
      const errorMessage = (error as Error).message;
      this.logManager.logError(
        `Failed to launch: ${errorMessage}`,
        error as Error
      );
      return { success: false, error: errorMessage };
    }
  }

  async stopKoboldCpp(): Promise<void> {
    if (this.koboldProcess) {
      await terminateProcess(this.koboldProcess, {
        timeoutMs: 5000,
        logError: (message, error) => this.logManager.logError(message, error),
      });
      this.koboldProcess = null;
    }
  }

  async cleanup(): Promise<void> {
    if (this.koboldProcess) {
      await terminateProcess(this.koboldProcess, {
        logError: (message, error) => this.logManager.logError(message, error),
      });
      this.koboldProcess = null;
    }
  }
}
