import { useState, useCallback, useEffect } from 'react';
import { error } from '@/utils/logger';
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
  const [isChecking, setIsChecking] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const checkForAppUpdates = useCallback(async () => {
    setIsChecking(true);

    try {
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
      setLastChecked(new Date());

      return updateInfo;
    } catch (err) {
      error('Failed to check for app updates:', err as Error);
      return null;
    } finally {
      setIsChecking(false);
    }
  }, []);

  const openReleasePage = useCallback(() => {
    if (updateInfo?.releaseUrl) {
      window.electronAPI.app.openExternal(updateInfo.releaseUrl);
    }
  }, [updateInfo]);

  useEffect(() => {
    checkForAppUpdates();
  }, [checkForAppUpdates]);

  return {
    updateInfo,
    isChecking,
    lastChecked,
    checkForAppUpdates,
    openReleasePage,
    hasUpdate: updateInfo?.hasUpdate || false,
  };
};
