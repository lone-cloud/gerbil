import { readdir, stat, rm } from 'fs/promises';
import { join } from 'path';
import { execa } from 'execa';

import {
  getCurrentKoboldBinary,
  setCurrentKoboldBinary,
  getInstallDir,
} from '../config';
import { sendToRenderer } from '../window';
import { pathExists } from '@/utils/node/fs';
import { logError } from '@/utils/node/logging';
import { getLauncherPath } from '@/utils/node/path';
import type { InstalledBackend } from '@/types/electron';

const versionCache = new Map<
  string,
  { version: string; actualVersion?: string } | null
>();

export function clearVersionCache(path?: string) {
  if (path) {
    versionCache.delete(path);
  } else {
    versionCache.clear();
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
        const versionInfo = await getVersionFromBinary(launcher.path);

        if (!versionInfo) {
          return null;
        }

        return {
          version: versionInfo.version,
          path: launcher.path,
          filename: launcher.filename,
          size: launcher.size,
          actualVersion: versionInfo.actualVersion,
        } as InstalledBackend;
      } catch (error) {
        logError(
          `Could not detect version for ${launcher.filename}:`,
          error as Error
        );
        return null;
      }
    });

    const results = await Promise.all(versionPromises);
    return results.filter(
      (version): version is InstalledBackend => version !== null
    );
  } catch (error) {
    logError('Error scanning install directory:', error as Error);
    return [];
  }
}

export async function getCurrentBackend() {
  const currentBinaryPath = getCurrentKoboldBinary();
  const backends = await getInstalledBackends();

  if (currentBinaryPath && (await pathExists(currentBinaryPath))) {
    const currentBackend = backends.find(
      (b: InstalledBackend) => b.path === currentBinaryPath
    );
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
      path: currentBackend.path,
      filename,
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
      return { success: false, error: 'Release not found' };
    }

    const currentBinaryPath = getCurrentKoboldBinary();
    if (currentBinaryPath === binaryPath) {
      return {
        success: false,
        error: 'Cannot delete the currently active release',
      };
    }

    const releaseDir = binaryPath.split(/[/\\]/).slice(0, -1).join('/');

    if (await pathExists(releaseDir)) {
      await rm(releaseDir, { recursive: true, force: true });

      clearVersionCache(binaryPath);
      sendToRenderer('versions-updated');

      return { success: true };
    }

    return { success: false, error: 'Release directory not found' };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

export async function getVersionFromBinary(launcherPath: string) {
  try {
    if (!(await pathExists(launcherPath))) {
      return null;
    }

    if (versionCache.has(launcherPath)) {
      return versionCache.get(launcherPath);
    }

    let folderVersion: string | null = null;
    let actualVersion: string | null = null;

    const folderName = launcherPath.split(/[/\\]/).slice(-2, -1)[0];
    if (folderName) {
      const versionMatch = folderName.match(
        /-(\d+\.\d+(?:\.\d+)?(?:\.[a-zA-Z0-9]+)*(?:-[a-zA-Z0-9]+)*)$/
      );
      if (versionMatch) {
        folderVersion = versionMatch[1];
      }
    }

    try {
      const result = await execa(launcherPath, ['--version'], {
        timeout: 30000,
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      const allOutput = (result.stdout + result.stderr).trim();
      const lines = allOutput.split('\n').filter((line) => line.trim());

      if (lines.length > 0) {
        const lastLine = lines[lines.length - 1].trim();
        const versionMatch = lastLine.match(
          /^(\d+\.\d+(?:\.\d+)?(?:\.[a-zA-Z0-9]+)*(?:-[a-zA-Z0-9]+)*)$/
        );
        if (versionMatch) {
          actualVersion = versionMatch[1];
        }
      }
    } catch {}

    const result = {
      version: folderVersion || actualVersion || 'unknown',
      actualVersion:
        folderVersion && actualVersion && folderVersion !== actualVersion
          ? actualVersion
          : undefined,
    };

    versionCache.set(launcherPath, result);
    return result;
  } catch {
    versionCache.set(launcherPath, null);
    return null;
  }
}
