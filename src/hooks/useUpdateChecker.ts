import { useState, useCallback, useEffect } from 'react';
import {
  getDisplayNameFromPath,
  compareVersions,
  stripAssetExtensions,
} from '@/utils/version';
import { useKoboldBackendsStore } from '@/stores/koboldBackends';
import { getROCmDownload } from '@/utils/rocm';
import type { InstalledBackend, DownloadItem } from '@/types/electron';
import type { DismissedUpdate } from '@/types';

export interface BinaryUpdateInfo {
  currentBackend: InstalledBackend;
  availableUpdate: DownloadItem;
}

export const useUpdateChecker = () => {
  const [updateInfo, setUpdateInfo] = useState<BinaryUpdateInfo | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [dismissedUpdates, setDismissedUpdates] = useState<DismissedUpdate[]>(
    []
  );

  const { availableDownloads: releases, loadingRemote } =
    useKoboldBackendsStore();
  useEffect(() => {
    const loadDismissedUpdates = async () => {
      const dismissed = (await window.electronAPI.config.get(
        'dismissedUpdates'
      )) as DismissedUpdate[] | undefined;

      if (dismissed) {
        setDismissedUpdates(dismissed);
      }
    };

    void loadDismissedUpdates();
  }, []);

  const checkForUpdates = useCallback(async () => {
    if (loadingRemote || releases.length === 0) {
      return;
    }

    setIsChecking(true);
    const [currentBackend, rocmDownload] = await Promise.all([
      window.electronAPI.kobold.getCurrentBackend(),
      getROCmDownload(),
    ]);

    if (!currentBackend) {
      setIsChecking(false);
      return;
    }

    const availableDownloads: DownloadItem[] = [...releases];
    if (rocmDownload) {
      availableDownloads.push(rocmDownload);
    }

    const currentDisplayName = getDisplayNameFromPath(currentBackend);

    const matchingDownload = availableDownloads.find(
      (download: DownloadItem) => {
        const downloadBaseName = stripAssetExtensions(download.name);
        return downloadBaseName === currentDisplayName;
      }
    );

    if (matchingDownload && matchingDownload.version) {
      const hasUpdate =
        compareVersions(matchingDownload.version, currentBackend.version) > 0;

      if (hasUpdate) {
        const isUpdateDismissed = dismissedUpdates.some(
          (dismissedUpdate) =>
            dismissedUpdate.currentBackendPath === currentBackend.path &&
            dismissedUpdate.targetVersion === matchingDownload.version
        );

        if (!isUpdateDismissed) {
          setUpdateInfo({
            currentBackend,
            availableUpdate: matchingDownload,
          });
          setShowUpdateModal(true);
        }
      }
    }

    setIsChecking(false);
  }, [dismissedUpdates, releases, loadingRemote]);

  const skipUpdate = useCallback(() => {
    if (updateInfo && updateInfo.availableUpdate.version) {
      const newDismissedUpdate: DismissedUpdate = {
        currentBackendPath: updateInfo.currentBackend.path,
        targetVersion: updateInfo.availableUpdate.version,
      };

      const newDismissedUpdates = [...dismissedUpdates, newDismissedUpdate];
      setDismissedUpdates(newDismissedUpdates);
      window.electronAPI.config.set('dismissedUpdates', newDismissedUpdates);
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
