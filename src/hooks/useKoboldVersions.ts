import { useState, useEffect, useCallback } from 'react';
import { logError } from '@/utils/logger';
import { getROCmDownload } from '@/utils/rocm';
import { GITHUB_API } from '@/constants';
import { filterAssetsByPlatform } from '@/utils/platform';
import type {
  DownloadItem,
  GitHubRelease,
  ReleaseWithStatus,
  GitHubAsset,
  InstalledVersion,
} from '@/types/electron';
import { sortDownloadsByType } from '@/utils/assets';

interface CachedReleaseData {
  releases: DownloadItem[];
  timestamp: number;
}

interface HandleDownloadParams {
  item: DownloadItem;
  isUpdate?: boolean;
  wasCurrentBinary?: boolean;
}

const CACHE_KEY = 'kobold-releases-cache';
const CACHE_DURATION = 60000;

const loadFromCache = (): CachedReleaseData | null => {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;

    const data: CachedReleaseData = JSON.parse(cached);
    const isExpired = Date.now() - data.timestamp > CACHE_DURATION;

    return isExpired ? null : data;
  } catch {
    return null;
  }
};

const saveToCache = (releases: DownloadItem[]) => {
  try {
    const data: CachedReleaseData = {
      releases,
      timestamp: Date.now(),
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {
    void 0;
  }
};

const transformReleaseToDownloadItems = (
  release: GitHubRelease,
  platform: string
) => {
  const version = release.tag_name?.replace(/^v/, '') || 'unknown';
  const platformAssets = filterAssetsByPlatform(release.assets, platform);

  return platformAssets.map((asset) => ({
    name: asset.name,
    url: asset.browser_download_url,
    size: asset.size,
    version,
  }));
};

const fetchLatestReleaseFromAPI = async (
  platform: string
): Promise<DownloadItem[]> => {
  const response = await fetch(GITHUB_API.LATEST_RELEASE_URL);

  if (!response.ok) {
    if (response.status === 403) {
      throw new Error('GitHub API rate limit reached');
    }
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const release: GitHubRelease = await response.json();
  return transformReleaseToDownloadItems(release, platform);
};

const getLatestReleaseWithDownloadStatus =
  async (): Promise<ReleaseWithStatus | null> => {
    try {
      const response = await fetch(GITHUB_API.LATEST_RELEASE_URL);
      if (!response.ok) return null;

      const latestRelease = await response.json();
      if (!latestRelease) return null;

      const installedVersions =
        await window.electronAPI.kobold.getInstalledVersions();

      const availableAssets = latestRelease.assets.map((asset: GitHubAsset) => {
        const installedVersion = installedVersions.find(
          (v: InstalledVersion) => {
            const pathParts = v.path.split(/[/\\]/);
            const launcherIndex = pathParts.findIndex(
              (part) =>
                part === 'koboldcpp-launcher' ||
                part === 'koboldcpp-launcher.exe'
            );

            if (launcherIndex > 0) {
              const directoryName = pathParts[launcherIndex - 1];
              return directoryName === asset.name;
            }

            return false;
          }
        );

        return {
          asset,
          isDownloaded: !!installedVersion,
          installedVersion: installedVersion?.version,
        };
      });

      return {
        release: latestRelease,
        availableAssets,
      };
    } catch (err) {
      logError('Failed to fetch latest release with status:', err as Error);
      return null;
    }
  };

export const useKoboldVersions = () => {
  const [platform, setPlatform] = useState('');

  const [availableDownloads, setAvailableDownloads] = useState<DownloadItem[]>(
    []
  );

  const [loadingPlatform, setLoadingPlatform] = useState(true);
  const [loadingRemote, setLoadingRemote] = useState(true);

  const [downloading, setDownloading] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<
    Record<string, number>
  >({});

  const loadPlatform = useCallback(async () => {
    setLoadingPlatform(true);

    const platform = await window.electronAPI.kobold.getPlatform();

    setPlatform(platform);
    setLoadingPlatform(false);
  }, []);

  const loadRemoteVersions = useCallback(async () => {
    if (!platform) return;

    setLoadingRemote(true);

    try {
      const cached = loadFromCache();
      if (cached) {
        const rocm = await getROCmDownload();
        const allDownloads: DownloadItem[] = [...cached.releases];
        if (rocm) {
          allDownloads.push(rocm);
        }
        setAvailableDownloads(sortDownloadsByType(allDownloads));
        setLoadingRemote(false);
        return;
      }

      const [releases, rocm] = await Promise.all([
        fetchLatestReleaseFromAPI(platform),
        getROCmDownload(),
      ]);

      saveToCache(releases);

      const allDownloads: DownloadItem[] = [...releases];
      if (rocm) {
        allDownloads.push(rocm);
      }

      setAvailableDownloads(sortDownloadsByType(allDownloads));
    } catch (err) {
      logError('Failed to load remote versions:', err as Error);
      const cached = loadFromCache();
      if (cached) {
        const rocm = await getROCmDownload().catch(() => null);
        const allDownloads: DownloadItem[] = [...cached.releases];
        if (rocm) {
          allDownloads.push(rocm);
        }
        setAvailableDownloads(sortDownloadsByType(allDownloads));
      }
    } finally {
      setLoadingRemote(false);
    }
  }, [platform]);

  const handleDownload = useCallback(
    async ({
      item,
      isUpdate = false,
      wasCurrentBinary = false,
    }: HandleDownloadParams): Promise<boolean> => {
      const downloadName = item.name;

      setDownloading(downloadName);
      setDownloadProgress((prev) => ({ ...prev, [downloadName]: 0 }));

      try {
        const result = await window.electronAPI.kobold.downloadRelease({
          name: item.name,
          browser_download_url: item.url,
          size: item.size,
          version: item.version,
          isUpdate,
          wasCurrentBinary,
        });

        return result.success !== false;
      } catch (err) {
        logError(`Failed to download ${item.name}:`, err as Error);
        return false;
      } finally {
        setDownloading(null);
        setDownloadProgress((prev) => {
          const newProgress = { ...prev };
          delete newProgress[downloadName];
          return newProgress;
        });
      }
    },
    []
  );

  useEffect(() => {
    loadPlatform();
  }, [loadPlatform]);

  useEffect(() => {
    if (platform) {
      loadRemoteVersions();
    }
  }, [platform, loadRemoteVersions]);

  useEffect(() => {
    const handleProgress = (progress: number) => {
      if (downloading) {
        setDownloadProgress((prev) => ({
          ...prev,
          [downloading]: progress,
        }));
      }
    };

    window.electronAPI.kobold.onDownloadProgress?.(handleProgress);

    return () => {
      window.electronAPI.kobold.removeAllListeners?.('download-progress');
    };
  }, [downloading]);

  return {
    platform,
    availableDownloads,
    loadingPlatform,
    loadingRemote,
    downloading,
    downloadProgress,
    handleDownload,
    getLatestReleaseWithDownloadStatus,
  };
};
