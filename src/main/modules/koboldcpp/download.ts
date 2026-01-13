import { createWriteStream } from 'node:fs';
import { chmod, copyFile, mkdir, rename, rm, unlink } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { platform } from 'node:process';
import { dialog } from 'electron';
import { execa } from 'execa';
import type { DownloadReleaseOptions, GitHubAsset } from '@/types/electron';
import { pathExists } from '@/utils/node/fs';
import { logError } from '@/utils/node/logging';
import { getLauncherPath } from '@/utils/node/path';
import { stripAssetExtensions } from '@/utils/version';
import { getCurrentKoboldBinary, getInstallDir, setCurrentKoboldBinary } from '../config';
import { getMainWindow, sendToRenderer } from '../window';
import { clearBackendVersionCache, getVersionFromBinary } from './backend';

async function removeDirectoryWithRetry(dirPath: string, maxRetries = 3, currentRetry = 0) {
  try {
    await rm(dirPath, { recursive: true, force: true });
  } catch (error) {
    if (currentRetry < maxRetries) {
      const delay = 2 ** currentRetry * 1000;
      await new Promise((resolve) => setTimeout(resolve, delay));
      return removeDirectoryWithRetry(dirPath, maxRetries, currentRetry + 1);
    } else {
      logError(`Failed to remove directory after ${maxRetries} retries:`, error as Error);
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

  const totalBytes = parseInt(response.headers.get('content-length') || '0', 10);
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
    writer.on(
      'finish',
      () =>
        void (async () => {
          if (platform !== 'win32') {
            try {
              await chmod(tempPackedFilePath, 0o755);
            } catch (error) {
              logError('Failed to make binary executable:', error as Error);
            }
          }
          resolve();
        })()
    );
    writer.on('error', reject);
  });
}

async function setupLauncher(tempPackedFilePath: string, unpackedDirPath: string) {
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
    await mkdir(unpackDir, { recursive: true });
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
    const errorMessage = execaError.stderr || execaError.stdout || execaError.message;
    throw new Error(`Unpack failed: ${errorMessage}`);
  }
}

interface InstallBackendOptions {
  packedFilePath: string;
  unpackedDirPath: string;
  isUpdate?: boolean;
  wasCurrentBinary?: boolean;
  oldBackendPath?: string;
  skipUnpackError?: boolean;
  skipCleanup?: boolean;
}

async function installBackend({
  packedFilePath,
  unpackedDirPath,
  isUpdate = false,
  wasCurrentBinary = false,
  oldBackendPath,
  skipUnpackError = false,
  skipCleanup = false,
}: InstallBackendOptions) {
  if (!skipCleanup && (await pathExists(unpackedDirPath))) {
    await removeDirectoryWithRetry(unpackedDirPath);
  }

  await mkdir(unpackedDirPath, { recursive: true });

  if (skipUnpackError) {
    try {
      await unpackKoboldCpp(packedFilePath, unpackedDirPath);
    } catch {}
  } else {
    await unpackKoboldCpp(packedFilePath, unpackedDirPath);
  }

  const launcherPath = await setupLauncher(packedFilePath, unpackedDirPath);

  clearBackendVersionCache(launcherPath);

  if (oldBackendPath && isUpdate) {
    const oldInstallDir = join(oldBackendPath, '..');
    if (oldInstallDir !== unpackedDirPath) {
      await removeDirectoryWithRetry(oldInstallDir);
    }
  }

  if (!getCurrentKoboldBinary() || (isUpdate && wasCurrentBinary)) {
    await setCurrentKoboldBinary(launcherPath);
  }

  sendToRenderer('versions-updated');

  return launcherPath;
}

export async function downloadRelease(asset: GitHubAsset, options: DownloadReleaseOptions) {
  const tempPackedFilePath = join(getInstallDir(), `${asset.name}.packed`);
  const baseFilename = stripAssetExtensions(asset.name);
  const folderName = asset.version ? `${baseFilename}-${asset.version}` : baseFilename;
  const unpackedDirPath = join(getInstallDir(), folderName);

  try {
    await downloadFile(asset, tempPackedFilePath);

    await installBackend({
      packedFilePath: tempPackedFilePath,
      unpackedDirPath,
      isUpdate: options.isUpdate,
      wasCurrentBinary: options.wasCurrentBinary,
      oldBackendPath: options.oldBackendPath,
    });
  } catch (error) {
    logError('Failed to download or unpack binary:', error as Error);
    throw new Error('Failed to download or unpack binary');
  }
}

export async function importLocalBackend() {
  const result = await dialog.showOpenDialog(getMainWindow(), {
    title: 'Select Backend Executable',
    filters:
      platform === 'win32'
        ? [
            { name: 'Executable Files', extensions: ['exe'] },
            { name: 'All Files', extensions: ['*'] },
          ]
        : [{ name: 'All Files', extensions: ['*'] }],
    properties: ['openFile'],
  });

  if (result.canceled || result.filePaths.length === 0) {
    return { success: false };
  }

  const selectedPath = result.filePaths[0];

  try {
    if (platform !== 'win32') {
      await chmod(selectedPath, 0o755);
    }

    const backendVersion = await getVersionFromBinary(selectedPath);

    if (!backendVersion || backendVersion.version === 'unknown') {
      return {
        success: false,
        error: 'Invalid backend executable. Could not determine version information.',
      };
    }

    const version = backendVersion.actualVersion || backendVersion.version;
    const filename = basename(selectedPath);
    const baseFilename = stripAssetExtensions(filename);
    const folderName = `${baseFilename}-${version}`;
    const installDir = join(getInstallDir(), folderName);
    const packedFilePath = join(getInstallDir(), `${filename}.packed`);

    await copyFile(selectedPath, packedFilePath);

    await installBackend({
      packedFilePath,
      unpackedDirPath: installDir,
      skipUnpackError: true,
    });

    return { success: true };
  } catch (error) {
    logError('Failed to import local backend:', error as Error);
    return { success: false, error: (error as Error).message };
  }
}
