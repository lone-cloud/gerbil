import { useState, useCallback } from 'react';
import { getDisplayNameFromPath } from '@/utils/versionUtils';
import type { InstalledVersion, DownloadItem } from '@/types/electron';

const compareVersions = (versionA: string, versionB: string): number => {
  const cleanVersion = (version: string): string =>
    version.replace(/^v/, '').replace(/[^0-9.]/g, '');

  const parseVersion = (version: string): number[] =>
    cleanVersion(version)
      .split('.')
      .map((num) => parseInt(num, 10) || 0);

  const a = parseVersion(versionA);
  const b = parseVersion(versionB);
  const maxLength = Math.max(a.length, b.length);

  for (let i = 0; i < maxLength; i++) {
    const aVal = a[i] || 0;
    const bVal = b[i] || 0;

    if (aVal !== bVal) {
      return aVal - bVal;
    }
  }

  return 0;
};

interface UpdateInfo {
  currentVersion: InstalledVersion;
  availableUpdate: DownloadItem;
}

export const useUpdateChecker = () => {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);

  const checkForUpdates = useCallback(async () => {
    setIsChecking(true);

    try {
      const [currentBinaryPath, installedVersions, releases, rocm] =
        await Promise.all([
          window.electronAPI.config.get(
            'currentKoboldBinary'
          ) as Promise<string>,
          window.electronAPI.kobold.getInstalledVersions(),
          window.electronAPI.kobold.getLatestRelease(),
          window.electronAPI.kobold.getROCmDownload(),
        ]);

      if (!currentBinaryPath || installedVersions.length === 0) {
        return;
      }

      const currentVersion = installedVersions.find(
        (v: InstalledVersion) => v.path === currentBinaryPath
      );
      if (!currentVersion) {
        return;
      }

      const availableDownloads: DownloadItem[] = [...releases];
      if (rocm) {
        availableDownloads.push(rocm);
      }

      const currentDisplayName = getDisplayNameFromPath(currentVersion);

      const matchingDownload = availableDownloads.find(
        (download: DownloadItem) => {
          const downloadBaseName = download.name
            .replace(/\.(tar\.gz|zip|exe)$/i, '')
            .replace(/\.packed$/, '');
          return downloadBaseName === currentDisplayName;
        }
      );

      if (matchingDownload && matchingDownload.version) {
        const hasUpdate =
          compareVersions(matchingDownload.version, currentVersion.version) > 0;

        if (hasUpdate) {
          setUpdateInfo({
            currentVersion,
            availableUpdate: matchingDownload,
          });
          setShowUpdateModal(true);
        }
      }
    } catch (error) {
      window.electronAPI.logs.logError(
        'Failed to check for updates:',
        error as Error
      );
    } finally {
      setIsChecking(false);
    }
  }, []);

  const dismissUpdate = useCallback(() => {
    setShowUpdateModal(false);
    setUpdateInfo(null);
  }, []);

  return {
    updateInfo,
    showUpdateModal,
    isChecking,
    checkForUpdates,
    dismissUpdate,
  };
};
