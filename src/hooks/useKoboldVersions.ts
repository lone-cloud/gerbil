import { useState, useEffect, useCallback } from 'react';
import { GITHUB_API, ROCM } from '@/constants';
import { filterAssetsByPlatform } from '@/utils/platform';
import type {
  DownloadItem,
  GitHubRelease,
  ReleaseWithStatus,
  GitHubAsset,
  InstalledVersion,
} from '@/types/electron';

interface PlatformInfo {
  platform: string;
  hasAMDGPU: boolean;
  hasROCm: boolean;
}

interface CachedReleaseData {
  releases: DownloadItem[];
  timestamp: number;
}

interface HandleDownloadParams {
  type: 'asset' | 'rocm';
  item?: DownloadItem;
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
  } catch (error) {
    window.electronAPI.logs.logError(
      'Failed to save releases to cache',
      error as Error
    );
  }
};

const transformReleaseToDownloadItems = (
  release: GitHubRelease,
  platform: string
): DownloadItem[] => {
  const version = release.tag_name?.replace(/^v/, '') || 'unknown';
  const platformAssets = filterAssetsByPlatform(release.assets, platform);

  return platformAssets.map((asset) => ({
    name: asset.name,
    url: asset.browser_download_url,
    size: asset.size,
    version,
    type: 'asset' as const,
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

const getROCmDownload = async (
  platform: string
): Promise<DownloadItem | null> => {
  if (platform !== 'linux') {
    return null;
  }

  try {
    const response = await fetch(GITHUB_API.LATEST_RELEASE_URL);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const latestRelease = await response.json();
    const version = latestRelease?.tag_name?.replace(/^v/, '') || 'unknown';

    return {
      name: ROCM.BINARY_NAME,
      url: ROCM.DOWNLOAD_URL,
      size: ROCM.SIZE_BYTES_APPROX,
      version,
      type: 'rocm',
    };
  } catch (error) {
    window.electronAPI.logs.logError(
      'Failed to fetch ROCm version info:',
      error as Error
    );
    return {
      name: ROCM.BINARY_NAME,
      url: ROCM.DOWNLOAD_URL,
      size: ROCM.SIZE_BYTES_APPROX,
      version: 'unknown',
      type: 'rocm',
    };
  }
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
    } catch (error) {
      window.electronAPI.logs.logError(
        'Failed to fetch latest release with status:',
        error as Error
      );
      return null;
    }
  };

interface UseKoboldVersionsReturn {
  platformInfo: PlatformInfo;
  availableDownloads: DownloadItem[];
  loadingPlatform: boolean;
  loadingRemote: boolean;
  downloading: string | null;
  downloadProgress: Record<string, number>;
  loadRemoteVersions: () => Promise<void>;
  refresh: () => Promise<void>;
  handleDownload: (params: HandleDownloadParams) => Promise<boolean>;
  setDownloading: (value: string | null) => void;
  setDownloadProgress: (
    value:
      | Record<string, number>
      | ((prev: Record<string, number>) => Record<string, number>)
  ) => void;
  getROCmDownload: (platform?: string) => Promise<DownloadItem | null>;
  getLatestReleaseWithDownloadStatus: () => Promise<ReleaseWithStatus | null>;
}

export const useKoboldVersions = (): UseKoboldVersionsReturn => {
  const [platformInfo, setPlatformInfo] = useState<PlatformInfo>({
    platform: '',
    hasAMDGPU: false,
    hasROCm: false,
  });

  const [availableDownloads, setAvailableDownloads] = useState<DownloadItem[]>(
    []
  );

  const [loadingPlatform, setLoadingPlatform] = useState(true);
  const [loadingRemote, setLoadingRemote] = useState(true);

  const [downloading, setDownloading] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<
    Record<string, number>
  >({});

  const loadPlatformInfo = useCallback(async () => {
    setLoadingPlatform(true);

    try {
      const platform = await window.electronAPI.kobold.getPlatform();

      let hasAMDGPU = false;
      let hasROCm = false;

      try {
        const gpuInfo = await window.electronAPI.kobold.detectGPU();
        hasAMDGPU = gpuInfo.hasAMD;

        if (gpuInfo.hasAMD) {
          const rocmInfo = await window.electronAPI.kobold.detectROCm();
          hasROCm = rocmInfo.supported;
        }
      } catch (gpuError) {
        window.electronAPI.logs.logError(
          'GPU detection failed:',
          gpuError as Error
        );
      }

      setPlatformInfo({
        platform: platform.platform,
        hasAMDGPU,
        hasROCm,
      });
    } catch (error) {
      window.electronAPI.logs.logError(
        'Failed to load platform info:',
        error as Error
      );
    } finally {
      setLoadingPlatform(false);
    }
  }, []);

  const loadRemoteVersions = useCallback(async () => {
    if (!platformInfo.platform) return;

    setLoadingRemote(true);

    try {
      const cached = loadFromCache();
      if (cached) {
        const rocm = await getROCmDownload(platformInfo.platform);
        const allDownloads: DownloadItem[] = [...cached.releases];
        if (rocm) {
          allDownloads.push(rocm);
        }
        setAvailableDownloads(allDownloads);
        setLoadingRemote(false);
        return;
      }

      const [releases, rocm] = await Promise.all([
        fetchLatestReleaseFromAPI(platformInfo.platform),
        getROCmDownload(platformInfo.platform),
      ]);

      saveToCache(releases);

      const allDownloads: DownloadItem[] = [...releases];
      if (rocm) {
        allDownloads.push(rocm);
      }

      setAvailableDownloads(allDownloads);
    } catch (error) {
      window.electronAPI.logs.logError(
        'Failed to load remote versions:',
        error as Error
      );

      const cached = loadFromCache();
      if (cached) {
        const rocm = await getROCmDownload(platformInfo.platform).catch(
          () => null
        );
        const allDownloads: DownloadItem[] = [...cached.releases];
        if (rocm) {
          allDownloads.push(rocm);
        }
        setAvailableDownloads(allDownloads);
      }
    } finally {
      setLoadingRemote(false);
    }
  }, [platformInfo.platform]);

  const handleDownload = useCallback(
    async ({
      type,
      item,
      isUpdate = false,
      wasCurrentBinary = false,
    }: HandleDownloadParams): Promise<boolean> => {
      if (type === 'asset' && !item) return false;

      const downloadName = item?.name || 'download';

      setDownloading(downloadName);
      setDownloadProgress((prev) => ({ ...prev, [downloadName]: 0 }));

      try {
        const result =
          type === 'rocm'
            ? await window.electronAPI.kobold.downloadROCm()
            : await window.electronAPI.kobold.downloadRelease({
                name: item!.name,
                browser_download_url: item!.url,
                size: item!.size,
                created_at: new Date().toISOString(),
                isUpdate,
                wasCurrentBinary,
              });

        return result.success !== false;
      } catch (error) {
        window.electronAPI.logs.logError(
          `Failed to download ${type}:`,
          error as Error
        );
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

  const refresh = useCallback(async () => {
    localStorage.removeItem(CACHE_KEY);
    await loadRemoteVersions();
  }, [loadRemoteVersions]);

  useEffect(() => {
    loadPlatformInfo();
  }, [loadPlatformInfo]);

  useEffect(() => {
    if (platformInfo.platform) {
      loadRemoteVersions();
    }
  }, [platformInfo.platform, loadRemoteVersions]);

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
    platformInfo,
    availableDownloads,
    loadingPlatform,
    loadingRemote,
    downloading,
    downloadProgress,
    loadRemoteVersions,
    refresh,
    handleDownload,
    setDownloading,
    setDownloadProgress,
    getROCmDownload: (platform?: string) =>
      getROCmDownload(platform || platformInfo.platform),
    getLatestReleaseWithDownloadStatus,
  };
};
