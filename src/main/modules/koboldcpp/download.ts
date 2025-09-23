import { createWriteStream } from 'fs';
import { join } from 'path';
import { platform } from 'process';
import { rm, unlink, rename, mkdir, chmod } from 'fs/promises';

import { execa } from 'execa';
import {
  getInstallDir,
  getCurrentKoboldBinary,
  setCurrentKoboldBinary,
} from '../config';
import { logError } from '@/utils/node/logging';
import { getMainWindow, sendToRenderer } from '../window';
import { pathExists } from '@/utils/node/fs';
import { stripAssetExtensions } from '@/utils/version';
import { getLauncherPath } from '@/utils/node/path';
import type { GitHubAsset } from '@/types/electron';

async function removeDirectoryWithRetry(
  dirPath: string,
  maxRetries = 3,
  currentRetry = 0
) {
  try {
    await rm(dirPath, { recursive: true, force: true });
  } catch (error) {
    if (currentRetry < maxRetries) {
      const delay = Math.pow(2, currentRetry) * 1000;
      await new Promise((resolve) => setTimeout(resolve, delay));
      return removeDirectoryWithRetry(dirPath, maxRetries, currentRetry + 1);
    } else {
      logError(
        `Failed to remove directory after ${maxRetries} retries:`,
        error as Error
      );
    }
  }
}

async function handleExistingDirectory(
  unpackedDirPath: string,
  isUpdate: boolean,
  wasCurrentBinary: boolean
) {
  if (await pathExists(unpackedDirPath)) {
    if (isUpdate || wasCurrentBinary) {
      try {
        await removeDirectoryWithRetry(unpackedDirPath);
      } catch (error) {
        logError('Failed to remove existing directory:', error as Error);
        throw new Error('Failed to remove existing installation');
      }
    } else {
      throw new Error(
        'Installation directory already exists. Please uninstall the existing version first.'
      );
    }
  }
}

async function downloadFile(asset: GitHubAsset, tempPackedFilePath: string) {
  const writer = createWriteStream(tempPackedFilePath);
  const mainWindow = getMainWindow();

  let downloadedBytes = 0;
  let lastProgressUpdate = 0;

  const response = await fetch(asset.browser_download_url);
  if (!response.ok || !response.body) {
    throw new Error(`Failed to download: ${response.statusText}`);
  }

  const totalBytes = parseInt(
    response.headers.get('content-length') || '0',
    10
  );
  const reader = response.body.getReader();

  const pump = async () => {
    const { done, value } = await reader.read();

    if (done) {
      writer.end();
      mainWindow.webContents.send('download-progress', 100);
      return;
    }

    downloadedBytes += value.length;
    if (totalBytes > 0) {
      const progress = (downloadedBytes / totalBytes) * 100;
      const now = Date.now();

      if (now - lastProgressUpdate > 100) {
        mainWindow.webContents.send('download-progress', progress);
        lastProgressUpdate = now;
      }
    }

    writer.write(Buffer.from(value));
    return pump();
  };

  await pump();

  await new Promise<void>((resolve, reject) => {
    writer.on('finish', async () => {
      if (platform !== 'win32') {
        try {
          await chmod(tempPackedFilePath, 0o755);
        } catch (error) {
          logError('Failed to make binary executable:', error as Error);
        }
      }
      resolve();
    });
    writer.on('error', reject);
  });
}

async function setupLauncher(
  tempPackedFilePath: string,
  unpackedDirPath: string
) {
  let launcherPath = await getLauncherPath(unpackedDirPath);

  if (!launcherPath || !(await pathExists(launcherPath))) {
    const expectedLauncherName =
      platform === 'win32' ? 'koboldcpp-launcher.exe' : 'koboldcpp-launcher';
    const newLauncherPath = join(unpackedDirPath, expectedLauncherName);

    if (await pathExists(tempPackedFilePath)) {
      try {
        await rename(tempPackedFilePath, newLauncherPath);
        launcherPath = newLauncherPath;
      } catch (error) {
        logError('Failed to rename binary as launcher:', error as Error);
      }
    }
  } else {
    try {
      await unlink(tempPackedFilePath);
    } catch (error) {
      logError('Failed to cleanup packed file:', error as Error);
    }
  }

  if (!launcherPath || !(await pathExists(launcherPath))) {
    throw new Error('Failed to find or create launcher');
  }

  return launcherPath;
}

async function unpackKoboldCpp(packedPath: string, unpackDir: string) {
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

export async function downloadRelease(asset: GitHubAsset) {
  const tempPackedFilePath = join(getInstallDir(), `${asset.name}.packed`);
  const baseFilename = stripAssetExtensions(asset.name);
  const folderName = asset.version
    ? `${baseFilename}-${asset.version}`
    : baseFilename;
  const unpackedDirPath = join(getInstallDir(), folderName);

  try {
    await handleExistingDirectory(
      unpackedDirPath,
      Boolean(asset.isUpdate),
      Boolean(asset.wasCurrentBinary)
    );
    await downloadFile(asset, tempPackedFilePath);

    await mkdir(unpackedDirPath, { recursive: true });
    await unpackKoboldCpp(tempPackedFilePath, unpackedDirPath);
    const launcherPath = await setupLauncher(
      tempPackedFilePath,
      unpackedDirPath
    );

    const currentBinary = getCurrentKoboldBinary();
    if (!currentBinary || (asset.isUpdate && asset.wasCurrentBinary)) {
      await setCurrentKoboldBinary(launcherPath);
    }

    sendToRenderer('versions-updated');
    return launcherPath;
  } catch (error) {
    logError('Failed to download or unpack binary:', error as Error);
    throw new Error('Failed to download or unpack binary');
  }
}
