import { readdir, rm, stat } from 'node:fs/promises';
import { join } from 'node:path';

import { execa } from 'execa';

import type { InstalledBackend } from '@/types/electron';
import { pathExists } from '@/utils/node/fs';
import { logError } from '@/utils/node/logging';
import { getLauncherPath } from '@/utils/node/path';

import { getCurrentKoboldBinary, getInstallDir, setCurrentKoboldBinary } from '../config';
import { sendToRenderer } from '../window';

const backendVersionCache = new Map<string, { version: string; actualVersion?: string } | null>();

export function clearBackendVersionCache(path?: string) {
  if (path) {
    backendVersionCache.delete(path);
  } else {
    backendVersionCache.clear();
  }
}

export async function getInstalledBackends() {
  try {
    const installDir = getInstallDir();
    if (!(await pathExists(installDir))) {
      return [];
    }

    const items = await readdir(installDir);
    const launchers: { path: string; filename: string; size: number }[] = [];

    for (const item of items) {
      const itemPath = join(installDir, item);
      const stats = await stat(itemPath);

      if (stats.isDirectory()) {
        const launcherPath = await getLauncherPath(itemPath);
        if (launcherPath && (await pathExists(launcherPath))) {
          const launcherStats = await stat(launcherPath);
          const launcherFilename = launcherPath.split(/[/\\]/).pop() ?? '';
          launchers.push({
            filename: launcherFilename,
            path: launcherPath,
            size: launcherStats.size,
          });
        }
      }
    }

    const versionPromises = launchers.map(async (launcher) => {
      try {
        const versionInfo = await getVersionFromBinary(launcher.path);

        if (!versionInfo) {
          return null;
        }

        return {
          actualVersion: versionInfo.actualVersion,
          filename: launcher.filename,
          path: launcher.path,
          size: launcher.size,
          version: versionInfo.version,
        } as InstalledBackend;
      } catch (error) {
        logError(`Could not detect version for ${launcher.filename}:`, error as Error);
        return null;
      }
    });

    const results = await Promise.all(versionPromises);
    return results.filter((version): version is InstalledBackend => version !== null);
  } catch (error) {
    logError('Error scanning install directory:', error as Error);
    return [];
  }
}

export async function getCurrentBackend() {
  const currentBinaryPath = getCurrentKoboldBinary();
  const backends = await getInstalledBackends();

  if (currentBinaryPath && (await pathExists(currentBinaryPath))) {
    const currentBackend = backends.find((b: InstalledBackend) => b.path === currentBinaryPath);
    if (currentBackend) {
      return currentBackend;
    }
  }

  const firstBackend = backends[0];
  if (firstBackend) {
    await setCurrentKoboldBinary(firstBackend.path);
    return firstBackend;
  }

  if (currentBinaryPath) {
    await setCurrentKoboldBinary('');
  }

  return null;
}

export async function getCurrentBinaryInfo() {
  const currentBackend = await getCurrentBackend();

  if (currentBackend) {
    const pathParts = currentBackend.path.split(/[/\\]/);
    const filename = pathParts[pathParts.length - 2] || currentBackend.filename;

    return {
      filename,
      path: currentBackend.path,
    };
  }

  return null;
}

export async function setCurrentBackend(binaryPath: string) {
  if (await pathExists(binaryPath)) {
    await setCurrentKoboldBinary(binaryPath);

    sendToRenderer('versions-updated');

    return true;
  }

  return false;
}

export async function deleteRelease(binaryPath: string) {
  try {
    if (!(await pathExists(binaryPath))) {
      return { error: 'Release not found', success: false };
    }

    const currentBinaryPath = getCurrentKoboldBinary();
    if (currentBinaryPath === binaryPath) {
      return {
        error: 'Cannot delete the currently active release',
        success: false,
      };
    }

    const releaseDir = binaryPath.split(/[/\\]/).slice(0, -1).join('/');

    if (await pathExists(releaseDir)) {
      await rm(releaseDir, { force: true, recursive: true });

      clearBackendVersionCache(binaryPath);
      sendToRenderer('versions-updated');

      return { success: true };
    }

    return { error: 'Release directory not found', success: false };
  } catch (error) {
    return { error: (error as Error).message, success: false };
  }
}

export async function getVersionFromBinary(launcherPath: string) {
  try {
    if (!(await pathExists(launcherPath))) {
      return null;
    }

    if (backendVersionCache.has(launcherPath)) {
      return backendVersionCache.get(launcherPath);
    }

    let folderVersion: string | null = null;
    let actualVersion: string | null = null;

    const folderName = launcherPath.split(/[/\\]/).slice(-2, -1)[0];
    if (folderName) {
      const versionMatch = /-(\d+\.\d+(?:\.\d+)?(?:\.[a-zA-Z0-9]+)*(?:-[a-zA-Z0-9]+)*)$/.exec(
        folderName,
      );
      if (versionMatch) {
        folderVersion = versionMatch[1];
      }
    }

    try {
      const result = await execa(launcherPath, ['--version'], {
        stdio: ['ignore', 'pipe', 'pipe'],
        timeout: 30_000,
      });

      const allOutput = (result.stdout + result.stderr).trim();
      const lines = allOutput.split('\n').filter((line) => line.trim());

      if (lines.length > 0) {
        const lastLine = lines[lines.length - 1].trim();
        const versionMatch = /^(\d+\.\d+(?:\.\d+)?(?:\.[a-zA-Z0-9]+)*(?:-[a-zA-Z0-9]+)*)$/.exec(
          lastLine,
        );
        if (versionMatch) {
          actualVersion = versionMatch[1];
        }
      }
    } catch {}

    const result = {
      actualVersion:
        folderVersion && actualVersion && folderVersion !== actualVersion
          ? actualVersion
          : undefined,
      version: folderVersion ?? actualVersion ?? 'unknown',
    };

    backendVersionCache.set(launcherPath, result);
    return result;
  } catch {
    backendVersionCache.set(launcherPath, null);
    return null;
  }
}
