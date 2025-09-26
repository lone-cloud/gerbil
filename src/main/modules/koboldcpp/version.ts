import { readdir, stat } from 'fs/promises';
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
import type { InstalledVersion } from '@/types/electron';

export async function getInstalledVersions() {
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
        } as InstalledVersion;
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
      (version): version is InstalledVersion => version !== null
    );
  } catch (error) {
    logError('Error scanning install directory:', error as Error);
    return [];
  }
}

export async function getCurrentVersion() {
  const currentBinaryPath = getCurrentKoboldBinary();
  const versions = await getInstalledVersions();

  if (currentBinaryPath && (await pathExists(currentBinaryPath))) {
    const currentVersion = versions.find(
      (v: InstalledVersion) => v.path === currentBinaryPath
    );
    if (currentVersion) {
      return currentVersion;
    }
  }

  const firstVersion = versions[0];
  if (firstVersion) {
    await setCurrentKoboldBinary(firstVersion.path);
    return firstVersion;
  }

  if (currentBinaryPath) {
    await setCurrentKoboldBinary('');
  }

  return null;
}

export async function getCurrentBinaryInfo() {
  const currentVersion = await getCurrentVersion();

  if (currentVersion) {
    const pathParts = currentVersion.path.split(/[/\\]/);
    const filename = pathParts[pathParts.length - 2] || currentVersion.filename;

    return {
      path: currentVersion.path,
      filename,
    };
  }

  return null;
}

export async function setCurrentVersion(binaryPath: string) {
  if (await pathExists(binaryPath)) {
    await setCurrentKoboldBinary(binaryPath);

    sendToRenderer('versions-updated');

    return true;
  }

  return false;
}

export async function getVersionFromBinary(launcherPath: string) {
  try {
    if (!(await pathExists(launcherPath))) {
      return null;
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

      if (/^\d+\.\d+/.test(allOutput)) {
        const versionParts = allOutput.split(/\s+/)[0];
        if (versionParts && /^\d+\.\d+/.test(versionParts)) {
          actualVersion = versionParts;
        }
      }

      if (!actualVersion) {
        const lines = allOutput.split('\n');
        for (const line of lines) {
          const trimmedLine = line.trim();
          if (/^\d+\.\d+/.test(trimmedLine)) {
            const versionPart = trimmedLine.split(/\s+/)[0];
            if (versionPart) {
              actualVersion = versionPart;
              break;
            }
          }
        }
      }
    } catch {}

    return {
      version: folderVersion || actualVersion || 'unknown',
      actualVersion:
        folderVersion && actualVersion && folderVersion !== actualVersion
          ? actualVersion
          : undefined,
    };
  } catch {
    return null;
  }
}
