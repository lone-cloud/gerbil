import { useState, useCallback, useEffect } from 'react';
import {
  getDisplayNameFromPath,
  compareVersions,
  stripAssetExtensions,
} from '@/utils/version';
import { useKoboldVersionsStore } from '@/stores/koboldVersions';
import { getROCmDownload } from '@/utils/rocm';
import type { InstalledVersion, DownloadItem } from '@/types/electron';

export interface BinaryUpdateInfo {
  currentVersion: InstalledVersion;
  availableUpdate: DownloadItem;
}

export const useUpdateChecker = () => {
  const [updateInfo, setUpdateInfo] = useState<BinaryUpdateInfo | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [dismissedUpdates, setDismissedUpdates] = useState<Set<string>>(
    new Set()
  );

  const { availableDownloads: releases, loadingRemote } =
    useKoboldVersionsStore();
  useEffect(() => {
    const loadDismissedUpdates = async () => {
      const dismissed = (await window.electronAPI.config.get(
        'dismissedUpdates'
      )) as string[] | undefined;

      if (dismissed) {
        setDismissedUpdates(new Set(dismissed));
      }
    };

    loadDismissedUpdates();
  }, []);

  const checkForUpdates = useCallback(async () => {
    if (loadingRemote || releases.length === 0) {
      return;
    }

    setIsChecking(true);
    const [currentVersion, rocmDownload] = await Promise.all([
      window.electronAPI.kobold.getCurrentVersion(),
      getROCmDownload(),
    ]);

    if (!currentVersion) {
      setIsChecking(false);
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

    setIsChecking(false);
  }, [dismissedUpdates, releases, loadingRemote]);

  const skipUpdate = useCallback(() => {
    if (updateInfo) {
      const updateKey = `${updateInfo.currentVersion.path}-${updateInfo.availableUpdate.version}`;
      const newDismissedUpdates = new Set([...dismissedUpdates, updateKey]);
      setDismissedUpdates(newDismissedUpdates);
      window.electronAPI.config.set(
        'dismissedUpdates',
        Array.from(newDismissedUpdates)
      );
    }
    setShowUpdateModal(false);
    setUpdateInfo(null);
  }, [updateInfo, dismissedUpdates]);

  const closeModal = useCallback(() => {
    setShowUpdateModal(false);
    setUpdateInfo(null);
  }, []);

  return {
    updateInfo,
    showUpdateModal,
    isChecking,
    checkForUpdates,
    skipUpdate,
    closeModal,
  };
};
