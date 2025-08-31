import { useState, useCallback, useEffect } from 'react';
import { error } from '@/utils/logger';
import {
  getDisplayNameFromPath,
  compareVersions,
  stripAssetExtensions,
} from '@/utils/version';
import { useKoboldVersions } from '@/hooks/useKoboldVersions';
import { getROCmDownload } from '@/utils/rocm';
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

  const { availableDownloads: releases } = useKoboldVersions();

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
      } catch (err) {
        error('Failed to load dismissed updates:', err as Error);
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
    } catch (err) {
      error('Failed to save dismissed updates:', err as Error);
    }
  }, []);

  const checkForUpdates = useCallback(async () => {
    if (!dismissedUpdatesLoaded || releases.length === 0) {
      return;
    }

    setIsChecking(true);

    try {
      const [currentVersion, rocmDownload] = await Promise.all([
        window.electronAPI.kobold.getCurrentVersion(),
        getROCmDownload(),
      ]);

      if (!currentVersion) {
        return;
      }
      if (!currentVersion) {
        return;
      }

      const availableDownloads: DownloadItem[] = [...releases];
      if (rocmDownload) {
        availableDownloads.push(rocmDownload);
      }

      const currentDisplayName = getDisplayNameFromPath(currentVersion);

      const matchingDownload = availableDownloads.find(
        (download: DownloadItem) => {
          const downloadBaseName = stripAssetExtensions(download.name);
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
    } catch (err) {
      error('Failed to check for updates:', err as Error);
    } finally {
      setIsChecking(false);
    }
  }, [dismissedUpdates, dismissedUpdatesLoaded, releases]);

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
