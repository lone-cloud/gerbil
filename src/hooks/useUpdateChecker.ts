import { useState, useCallback, useEffect } from 'react';
import { getDisplayNameFromPath } from '@/utils/versionUtils';
import { compareVersions } from '@/utils/downloadUtils';
import type { InstalledVersion, DownloadItem } from '@/types/electron';

interface UpdateInfo {
  currentVersion: InstalledVersion;
  availableUpdate: DownloadItem;
}

export const useUpdateChecker = () => {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [dismissedUpdates, setDismissedUpdates] = useState<Set<string>>(
    new Set()
  );
  const [dismissedUpdatesLoaded, setDismissedUpdatesLoaded] = useState(false);

  useEffect(() => {
    const loadDismissedUpdates = async () => {
      try {
        const dismissed = (await window.electronAPI.config.get(
          'dismissedUpdates'
        )) as string[] | undefined;
        if (dismissed) {
          setDismissedUpdates(new Set(dismissed));
        }
        setDismissedUpdatesLoaded(true);
      } catch (error) {
        window.electronAPI.logs.logError(
          'Failed to load dismissed updates:',
          error as Error
        );
        setDismissedUpdatesLoaded(true);
      }
    };

    loadDismissedUpdates();
  }, []);

  const saveDismissedUpdates = useCallback(async (updates: Set<string>) => {
    try {
      await window.electronAPI.config.set(
        'dismissedUpdates',
        Array.from(updates)
      );
    } catch (error) {
      window.electronAPI.logs.logError(
        'Failed to save dismissed updates:',
        error as Error
      );
    }
  }, []);

  const checkForUpdates = useCallback(async () => {
    if (!dismissedUpdatesLoaded) {
      return;
    }

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
          const updateKey = `${currentVersion.path}-${matchingDownload.version}`;

          if (!dismissedUpdates.has(updateKey)) {
            setUpdateInfo({
              currentVersion,
              availableUpdate: matchingDownload,
            });
            setShowUpdateModal(true);
          }
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
  }, [dismissedUpdates, dismissedUpdatesLoaded]);

  const dismissUpdate = useCallback(async () => {
    if (updateInfo) {
      const updateKey = `${updateInfo.currentVersion.path}-${updateInfo.availableUpdate.version}`;
      const newDismissedUpdates = new Set([...dismissedUpdates, updateKey]);
      setDismissedUpdates(newDismissedUpdates);
      await saveDismissedUpdates(newDismissedUpdates);
    }
    setShowUpdateModal(false);
    setUpdateInfo(null);
  }, [updateInfo, dismissedUpdates, saveDismissedUpdates]);

  return {
    updateInfo,
    showUpdateModal,
    isChecking,
    checkForUpdates,
    dismissUpdate,
  };
};
