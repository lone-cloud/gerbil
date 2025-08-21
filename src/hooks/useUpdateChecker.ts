import { useState, useCallback } from 'react';
import { getDisplayNameFromPath } from '@/utils/versionUtils';
import { compareVersions } from '@/utils';
import type { InstalledVersion, DownloadItem } from '@/types/electron';

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
