import { useState, useEffect, useCallback } from 'react';
import type { DownloadItem } from '@/types/electron';

interface PlatformInfo {
  platform: string;
  hasAMDGPU: boolean;
  hasROCm: boolean;
}

interface UseKoboldVersionsReturn {
  platformInfo: PlatformInfo;
  availableDownloads: DownloadItem[];
  loadingPlatform: boolean;
  loadingRemote: boolean;
  downloading: string | null;
  downloadProgress: Record<string, number>;
  loadRemoteVersions: () => Promise<void>;
  handleDownload: (
    type: 'asset' | 'rocm',
    item?: DownloadItem
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
      const [releases, rocm] = await Promise.all([
        window.electronAPI.kobold.getLatestRelease(),
        window.electronAPI.kobold.getROCmDownload(),
      ]);

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
    } finally {
      setLoadingRemote(false);
    }
  }, [platformInfo.platform]);

  const handleDownload = useCallback(
    async (type: 'asset' | 'rocm', item?: DownloadItem): Promise<boolean> => {
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
    handleDownload,
    setDownloading,
    setDownloadProgress,
  };
};
