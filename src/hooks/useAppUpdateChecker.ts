import { useCallback, useEffect, useState } from 'react';

import { GITHUB_API } from '@/constants';
import { withRetry } from '@/utils/logger';
import { compareVersions } from '@/utils/version';

interface AppUpdateInfo {
  currentVersion: string;
  latestVersion: string;
  releaseUrl: string;
  hasUpdate: boolean;
}

export const useAppUpdateChecker = () => {
  const [updateInfo, setUpdateInfo] = useState<AppUpdateInfo | null>(null),
    [canAutoUpdate, setCanAutoUpdate] = useState(false),
    [isUpdateDownloaded, setIsUpdateDownloaded] = useState(false),
    [isDownloading, setIsDownloading] = useState(false);

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
      if (!canAutoUpdate) {
        return;
      }

      setIsDownloading(true);

      const checkResult = await window.electronAPI.updater.checkForUpdates();
      if (!checkResult) {
        setIsDownloading(false);
        return;
      }

      const success = await window.electronAPI.updater.downloadUpdate();
      if (success) {
        setIsUpdateDownloaded(true);
      }

      setIsDownloading(false);
    }, [canAutoUpdate]),
    installUpdate = useCallback(() => {
      if (isUpdateDownloaded) {
        void window.electronAPI.updater.quitAndInstall();
      }
    }, [isUpdateDownloaded]),
    checkForAppUpdates = useCallback(async () => {
      try {
        const currentVersion = await window.electronAPI.app.getVersion(),
          response = await withRetry(() =>
            fetch(`${GITHUB_API.BASE_URL}/repos/${GITHUB_API.GERBIL_REPO}/releases/latest`),
          );

        if (!response.ok) {
          throw new Error('Failed to fetch latest release');
        }

        const release = await response.json(),
          latestVersion = release.tag_name?.replace(/^v/, '') ?? '';

        if (!latestVersion) {
          throw new Error('Invalid release data');
        }

        const hasUpdate = compareVersions(latestVersion, currentVersion) > 0,
          info: AppUpdateInfo = {
            currentVersion,
            hasUpdate,
            latestVersion,
            releaseUrl: release.html_url,
          };

        setUpdateInfo(info);
      } catch (error) {
        window.electronAPI.logs.logError(
          'Failed to check for app updates',
          error instanceof Error ? error : undefined,
        );
      }
    }, []);

  useEffect(() => {
    void checkForAppUpdates();
  }, [checkForAppUpdates]);

  return {
    canAutoUpdate,
    downloadUpdate,
    hasUpdate: updateInfo?.hasUpdate ?? false,
    installUpdate,
    isDownloading,
    isUpdateDownloaded,
    releaseUrl: updateInfo?.releaseUrl,
  };
};
