import { create } from 'zustand';
import { logError, safeExecute } from '@/utils/logger';
import { getROCmDownload } from '@/utils/rocm';
import { GITHUB_API } from '@/constants';
import { filterAssetsByPlatform } from '@/utils/platform';
import type {
  DownloadItem,
  GitHubRelease,
  ReleaseWithStatus,
  GitHubAsset,
  InstalledBackend,
} from '@/types/electron';
import { sortDownloadsByType } from '@/utils/assets';

interface HandleDownloadParams {
  item: DownloadItem;
  isUpdate?: boolean;
  wasCurrentBinary?: boolean;
  oldVersionPath?: string;
}

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

const fetchLatestReleaseFromAPI = async (platform: string) => {
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

interface KoboldVersionsState {
  platform: string;
  availableDownloads: DownloadItem[];
  loadingPlatform: boolean;
  loadingRemote: boolean;
  downloading: string | null;
  downloadProgress: Record<string, number>;

  initialize: () => Promise<void>;
  handleDownload: (params: HandleDownloadParams) => Promise<void>;
  getLatestReleaseWithDownloadStatus: () => Promise<ReleaseWithStatus | null>;
}

export const useKoboldVersionsStore = create<KoboldVersionsState>(
  (set, get) => ({
    platform: '',
    availableDownloads: [],
    loadingPlatform: true,
    loadingRemote: true,
    downloading: null,
    downloadProgress: {},

    initialize: async () => {
      set({ loadingPlatform: true, loadingRemote: true });

      try {
        const platform = await window.electronAPI.kobold.getPlatform();
        set({ platform, loadingPlatform: false });

        const [releases, rocm] = await Promise.all([
          fetchLatestReleaseFromAPI(platform),
          getROCmDownload(),
        ]);

        const allDownloads: DownloadItem[] = [...releases];
        if (rocm) {
          allDownloads.push(rocm);
        }

        set({ availableDownloads: sortDownloadsByType(allDownloads) });
      } catch (err) {
        logError('Failed to initialize store:', err as Error);
        set({ availableDownloads: [] });
      } finally {
        set({ loadingRemote: false });
      }
    },

    handleDownload: async (params: HandleDownloadParams) => {
      const {
        item,
        isUpdate = false,
        wasCurrentBinary = false,
        oldVersionPath,
      } = params;
      const { downloading } = get();

      if (downloading) {
        return;
      }

      set({ downloading: item.name, downloadProgress: { [item.name]: 0 } });

      const progressCleanup = window.electronAPI.kobold.onDownloadProgress(
        (progress) => {
          set({ downloadProgress: { [item.name]: progress } });
        }
      );

      const asset: GitHubAsset = {
        name: item.name,
        browser_download_url: item.url,
        size: item.size,
        version: item.version,
      };

      await window.electronAPI.kobold.downloadRelease(asset, {
        isUpdate,
        wasCurrentBinary,
        oldVersionPath,
      });

      progressCleanup();
      set({ downloading: null, downloadProgress: {} });
    },
    getLatestReleaseWithDownloadStatus: async () =>
      safeExecute(async () => {
        const [response, installedVersions] = await Promise.all([
          fetch(GITHUB_API.LATEST_RELEASE_URL),
          window.electronAPI.kobold.getInstalledBackends(),
        ]);

        if (!response.ok) return null;

        const latestRelease = await response.json();
        if (!latestRelease) return null;

        const availableAssets = latestRelease.assets.map(
          (asset: GitHubAsset) => {
            const installedBackend = installedVersions.find(
              (v: InstalledBackend) => {
                const pathParts = v.path.split(/[/\\]/);
                const launcherIndex = pathParts.findIndex(
                  (part: string) =>
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
              isDownloaded: !!installedBackend,
              installedVersion: installedBackend?.version,
            };
          }
        );

        return {
          release: latestRelease,
          availableAssets,
        };
      }, 'Failed to fetch latest release with status:'),
  })
);

useKoboldVersionsStore.getState().initialize();
