import { useState, useCallback, useEffect } from 'react';
import { tryExecute } from '@/utils/logger';
import { compareVersions } from '@/utils/version';
import { GITHUB_API } from '@/constants';

interface AppUpdateInfo {
  currentVersion: string;
  latestVersion: string;
  releaseUrl: string;
  hasUpdate: boolean;
}

export const useAppUpdateChecker = () => {
  const [updateInfo, setUpdateInfo] = useState<AppUpdateInfo | null>(null);
  const [canAutoUpdate, setCanAutoUpdate] = useState(false);
  const [isUpdateDownloaded, setIsUpdateDownloaded] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    const initializeUpdater = async () => {
      const [canUpdate, isDownloaded] = await Promise.all([
        window.electronAPI.updater.canAutoUpdate(),
        window.electronAPI.updater.isUpdateDownloaded(),
      ]);

      setCanAutoUpdate(canUpdate);
      setIsUpdateDownloaded(isDownloaded);
    };

    void initializeUpdater();
  }, []);

  const downloadUpdate = useCallback(async () => {
    if (!canAutoUpdate) return;

    setIsDownloading(true);

    await tryExecute(async () => {
      const checkResult = await window.electronAPI.updater.checkForUpdates();
      if (!checkResult) {
        setIsDownloading(false);
        return;
      }

      const success = await window.electronAPI.updater.downloadUpdate();
      if (success) {
        setIsUpdateDownloaded(true);
      }
    }, 'Failed to download update');

    setIsDownloading(false);
  }, [canAutoUpdate]);

  const installUpdate = useCallback(() => {
    if (isUpdateDownloaded) {
      window.electronAPI.updater.quitAndInstall();
    }
  }, [isUpdateDownloaded]);

  const checkForAppUpdates = useCallback(async () => {
    await tryExecute(async () => {
      const currentVersion = await window.electronAPI.app.getVersion();

      const response = await fetch(
        `${GITHUB_API.BASE_URL}/repos/${GITHUB_API.GERBIL_REPO}/releases/latest`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch latest release');
      }

      const release = await response.json();
      const latestVersion = release.tag_name?.replace(/^v/, '') || '';

      if (!latestVersion) {
        throw new Error('Invalid release data');
      }

      const hasUpdate = compareVersions(latestVersion, currentVersion) > 0;

      const updateInfo: AppUpdateInfo = {
        currentVersion,
        latestVersion,
        releaseUrl: release.html_url,
        hasUpdate,
      };

      setUpdateInfo(updateInfo);
    }, 'Failed to check for app updates');
  }, []);

  useEffect(() => {
    void checkForAppUpdates();
  }, [checkForAppUpdates]);

  return {
    releaseUrl: updateInfo?.releaseUrl,
    hasUpdate: updateInfo?.hasUpdate || false,
    canAutoUpdate,
    isUpdateDownloaded,
    isDownloading,
    downloadUpdate,
    installUpdate,
  };
};
