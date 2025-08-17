import { useState, useEffect, useCallback } from 'react';
import { filterAssetsByPlatform } from '@/utils/platform';
import type { GitHubAsset, GitHubRelease } from '@/types';

interface PlatformInfo {
  platform: string;
  hasAMDGPU: boolean;
  hasROCm: boolean;
}

interface ROCmDownload {
  name: string;
  url: string;
  size: number;
  version?: string;
}

interface UseKoboldVersionsReturn {
  platformInfo: PlatformInfo;
  latestRelease: GitHubRelease | null;
  filteredAssets: GitHubAsset[];
  rocmDownload: ROCmDownload | null;
  loadingPlatform: boolean;
  loadingRemote: boolean;
  downloading: string | null;
  downloadProgress: Record<string, number>;
  loadRemoteVersions: () => Promise<void>;
  handleDownload: (
    type: 'asset' | 'rocm',
    asset?: GitHubAsset
  ) => Promise<boolean>;
  setDownloading: (value: string | null) => void;
  setDownloadProgress: (
    value:
      | Record<string, number>
      | ((prev: Record<string, number>) => Record<string, number>)
  ) => void;
}

export const useKoboldVersions = (): UseKoboldVersionsReturn => {
  const [platformInfo, setPlatformInfo] = useState<PlatformInfo>({
    platform: '',
    hasAMDGPU: false,
    hasROCm: false,
  });

  const [latestRelease, setLatestRelease] = useState<GitHubRelease | null>(
    null
  );
  const [filteredAssets, setFilteredAssets] = useState<GitHubAsset[]>([]);
  const [rocmDownload, setRocmDownload] = useState<ROCmDownload | null>(null);

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
      const [release, rocm] = await Promise.all([
        window.electronAPI.kobold.getLatestRelease(),
        window.electronAPI.kobold.getROCmDownload(),
      ]);

      setLatestRelease(release);
      setRocmDownload(rocm);

      if (release) {
        const filtered = filterAssetsByPlatform(
          release.assets,
          platformInfo.platform
        );
        setFilteredAssets(filtered);
      }
    } catch (error) {
      window.electronAPI.logs.logError(
        'Failed to load remote versions:',
        error as Error
      );
    } finally {
      setLoadingRemote(false);
    }
  }, [platformInfo.platform]);

  const handleDownload = useCallback(
    async (type: 'asset' | 'rocm', asset?: GitHubAsset): Promise<boolean> => {
      if (type === 'asset' && !asset) return false;

      const downloadName =
        type === 'asset' ? asset!.name : rocmDownload?.name || 'rocm';

      setDownloading(downloadName);
      setDownloadProgress((prev) => ({ ...prev, [downloadName]: 0 }));

      try {
        const result =
          type === 'rocm'
            ? await window.electronAPI.kobold.downloadROCm()
            : await window.electronAPI.kobold.downloadRelease(asset!);

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
    [rocmDownload?.name]
  );

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
    latestRelease,
    filteredAssets,
    rocmDownload,
    loadingPlatform,
    loadingRemote,
    downloading,
    downloadProgress,
    loadRemoteVersions,
    handleDownload,
    setDownloading,
    setDownloadProgress,
  };
};
