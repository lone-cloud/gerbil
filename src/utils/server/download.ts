import { createWriteStream, chmodSync, existsSync } from 'fs';
import { unlink, rename, mkdir } from 'fs/promises';
import { join } from 'path';
import { pipeline } from 'stream/promises';
import got from 'got';
import type { LogManager } from '@/main/managers/LogManager';
import type { ConfigManager } from '@/main/managers/ConfigManager';
import type { WindowManager } from '@/main/managers/WindowManager';
import type { DownloadItem } from '@/types/electron';
import { stripAssetExtensions } from '@/utils/version';
import type { ChildProcess } from 'child_process';

export interface DownloadOptions {
  installDir: string;
  onProgress?: (progress: number) => void;
  isUpdate?: boolean;
  wasCurrentBinary?: boolean;
  logManager: LogManager;
  configManager: ConfigManager;
  windowManager: WindowManager;
  unpackFunction: (packedPath: string, unpackDir: string) => Promise<void>;
  getLauncherPath: (unpackedDir: string) => string | null;
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
  if (!isUpdate || !existsSync(unpackedDirPath)) {
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
  const writer = createWriteStream(tempPackedFilePath);
  let downloadedBytes = 0;
  const totalBytes = item.size;

  try {
    await pipeline(
      got.stream(item.url).on('downloadProgress', (progress) => {
        downloadedBytes = progress.transferred;
        if (onProgress && totalBytes > 0) {
          onProgress((downloadedBytes / totalBytes) * 100);
        }
      }),
      writer
    );

    if (process.platform !== 'win32') {
      try {
        chmodSync(tempPackedFilePath, 0o755);
      } catch (error) {
        logManager.logError(
          'Failed to make binary executable:',
          error as Error
        );
      }
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: `Download failed: ${(error as Error).message}`,
    };
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
  const unpackedDirPath = join(installDir, baseFilename);

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

    let launcherPath = getLauncherPath(unpackedDirPath);

    if (!launcherPath || !existsSync(launcherPath)) {
      const expectedLauncherName =
        process.platform === 'win32'
          ? 'koboldcpp-launcher.exe'
          : 'koboldcpp-launcher';
      const newLauncherPath = join(unpackedDirPath, expectedLauncherName);

      if (existsSync(tempPackedFilePath)) {
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

    if (launcherPath && existsSync(launcherPath)) {
      const currentBinary = configManager.getCurrentKoboldBinary();
      if (!currentBinary || (isUpdate && wasCurrentBinary)) {
        configManager.setCurrentKoboldBinary(launcherPath);
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
