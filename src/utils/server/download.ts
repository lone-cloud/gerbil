import { createWriteStream } from 'fs';
import { unlink, rename, mkdir, chmod } from 'fs/promises';
import { join } from 'path';
import axios from 'axios';
import type { LogManager } from '@/main/managers/LogManager';
import type { ConfigManager } from '@/main/managers/ConfigManager';
import type { WindowManager } from '@/main/managers/WindowManager';
import type { DownloadItem } from '@/types/electron';
import { stripAssetExtensions } from '@/utils/version';
import type { ChildProcess } from 'child_process';
import { pathExists } from '@/utils/fs';

export interface DownloadOptions {
  installDir: string;
  onProgress?: (progress: number) => void;
  isUpdate?: boolean;
  wasCurrentBinary?: boolean;
  version?: string;
  logManager: LogManager;
  configManager: ConfigManager;
  windowManager: WindowManager;
  unpackFunction: (packedPath: string, unpackDir: string) => Promise<void>;
  getLauncherPath: (unpackedDir: string) => Promise<string | null>;
  removeDirectoryWithRetry?: (dirPath: string) => Promise<void>;
  cleanup?: () => Promise<void>;
  koboldProcess?: ChildProcess;
}

export interface DownloadResult {
  success: boolean;
  path?: string;
  error?: string;
}

async function handleExistingDirectory(
  unpackedDirPath: string,
  isUpdate: boolean,
  koboldProcess: ChildProcess | undefined,
  windowManager: WindowManager,
  cleanup: (() => Promise<void>) | undefined,
  removeDirectoryWithRetry: ((dirPath: string) => Promise<void>) | undefined,
  logManager: LogManager
): Promise<{ success: boolean; error?: string }> {
  if (!isUpdate || !(await pathExists(unpackedDirPath))) {
    return { success: true };
  }

  try {
    if (koboldProcess && !koboldProcess.killed) {
      windowManager.sendKoboldOutput(
        'Stopping KoboldCpp process before update...'
      );

      if (cleanup) {
        await cleanup();
      }
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    if (removeDirectoryWithRetry) {
      await removeDirectoryWithRetry(unpackedDirPath);
    }
    return { success: true };
  } catch (error) {
    logManager.logError(
      'Failed to remove existing directory for update:',
      error as Error
    );
    return {
      success: false,
      error:
        `Cannot update: Failed to remove existing installation. ` +
        `Please ensure KoboldCpp is stopped and try again. ` +
        `Error: ${(error as Error).message}`,
    };
  }
}

async function downloadFile(
  item: DownloadItem,
  tempPackedFilePath: string,
  onProgress: ((progress: number) => void) | undefined,
  logManager: LogManager
): Promise<{ success: boolean; error?: string }> {
  try {
    const writer = createWriteStream(tempPackedFilePath);
    let downloadedBytes = 0;

    const response = await axios({
      method: 'GET',
      url: item.url,
      responseType: 'stream',
      timeout: 30000,
      maxRedirects: 5,
    });

    const totalBytes = item.size;

    response.data.on('data', (chunk: Buffer) => {
      downloadedBytes += chunk.length;
      if (onProgress && totalBytes > 0) {
        onProgress((downloadedBytes / totalBytes) * 100);
      }
    });

    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on('finish', async () => {
        if (process.platform !== 'win32') {
          try {
            await chmod(tempPackedFilePath, 0o755);
          } catch (error) {
            logManager.logError(
              'Failed to make binary executable:',
              error as Error
            );
          }
        }
        resolve({ success: true });
      });
      writer.on('error', (error) => {
        reject(error);
      });

      response.data.on('error', (error: Error) => {
        reject(error);
      });
    });
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}
export async function downloadAndUnpackBinary(
  item: DownloadItem,
  options: DownloadOptions
): Promise<DownloadResult> {
  const {
    installDir,
    onProgress,
    isUpdate,
    wasCurrentBinary,
    version,
    logManager,
    configManager,
    windowManager,
    unpackFunction,
    getLauncherPath,
    removeDirectoryWithRetry,
    cleanup,
    koboldProcess,
  } = options;

  const tempPackedFilePath = join(installDir, `${item.name}.packed`);
  const baseFilename = stripAssetExtensions(item.name);
  const folderName = version ? `${baseFilename}-${version}` : baseFilename;
  const unpackedDirPath = join(installDir, folderName);

  const dirResult = await handleExistingDirectory(
    unpackedDirPath,
    Boolean(isUpdate),
    koboldProcess,
    windowManager,
    cleanup,
    removeDirectoryWithRetry,
    logManager
  );

  if (!dirResult.success) {
    return { success: false, error: dirResult.error };
  }

  const downloadResult = await downloadFile(
    item,
    tempPackedFilePath,
    onProgress,
    logManager
  );
  if (!downloadResult.success) {
    return { success: false, error: downloadResult.error };
  }

  try {
    await mkdir(unpackedDirPath, { recursive: true });
    await unpackFunction(tempPackedFilePath, unpackedDirPath);

    let launcherPath = await getLauncherPath(unpackedDirPath);

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
          logManager.logError(
            'Failed to rename binary as launcher:',
            error as Error
          );
        }
      }
    } else {
      try {
        await unlink(tempPackedFilePath);
      } catch (error) {
        logManager.logError('Failed to cleanup packed file:', error as Error);
      }
    }

    if (launcherPath && (await pathExists(launcherPath))) {
      const currentBinary = configManager.getCurrentKoboldBinary();
      if (!currentBinary || (isUpdate && wasCurrentBinary)) {
        await configManager.setCurrentKoboldBinary(launcherPath);
      }

      windowManager.sendToRenderer('versions-updated');

      return {
        success: true,
        path: launcherPath,
      };
    } else {
      return {
        success: false,
        error: 'Failed to find or create koboldcpp launcher',
      };
    }
  } catch (error) {
    logManager.logError('Failed to unpack binary:', error as Error);
    return {
      success: false,
      error: `Failed to unpack binary: ${(error as Error).message}`,
    };
  }
}
