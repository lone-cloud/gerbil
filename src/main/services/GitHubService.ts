import type { GitHubRelease, DownloadItem } from '@/types/electron';
import { LogManager } from '@/main/managers/LogManager';
import { GITHUB_API } from '@/constants';
import { filterAssetsByPlatform } from '@/utils';

export class GitHubService {
  private lastApiCall = 0;
  private apiCooldown = 60000;
  private cachedRelease: GitHubRelease | null = null;
  private logManager: LogManager;

  constructor(logManager: LogManager) {
    this.logManager = logManager;
  }

  async getLatestRelease(): Promise<DownloadItem[]> {
    const now = Date.now();
    if (now - this.lastApiCall < this.apiCooldown && this.cachedRelease) {
      return this.transformReleaseToDownloadItems(this.cachedRelease);
    }

    try {
      const response = await fetch(GITHUB_API.LATEST_RELEASE_URL);

      if (!response.ok) {
        if (response.status === 403) {
          // eslint-disable-next-line no-console
          console.warn(
            'GitHub API rate limit reached, using cached data if available'
          );
          return this.cachedRelease
            ? this.transformReleaseToDownloadItems(this.cachedRelease)
            : [];
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      this.lastApiCall = now;
      this.cachedRelease = (await response.json()) as GitHubRelease;
      return this.transformReleaseToDownloadItems(this.cachedRelease);
    } catch (error) {
      this.logManager.logError(
        'Error fetching latest release:',
        error as Error
      );
      return this.cachedRelease
        ? this.transformReleaseToDownloadItems(this.cachedRelease)
        : [];
    }
  }

  private transformReleaseToDownloadItems(
    release: GitHubRelease
  ): DownloadItem[] {
    const version = release.tag_name?.replace(/^v/, '') || 'unknown';
    const platformAssets = filterAssetsByPlatform(
      release.assets,
      process.platform
    );

    return platformAssets.map((asset) => ({
      name: asset.name,
      url: asset.browser_download_url,
      size: asset.size,
      version,
      type: 'asset' as const,
    }));
  }

  async getRawLatestRelease(): Promise<GitHubRelease | null> {
    const now = Date.now();
    if (now - this.lastApiCall < this.apiCooldown && this.cachedRelease) {
      return this.cachedRelease;
    }

    try {
      const response = await fetch(GITHUB_API.LATEST_RELEASE_URL);

      if (!response.ok) {
        if (response.status === 403) {
          // eslint-disable-next-line no-console
          console.warn(
            'GitHub API rate limit reached, using cached data if available'
          );
          return this.cachedRelease;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      this.lastApiCall = now;
      this.cachedRelease = (await response.json()) as GitHubRelease;
      return this.cachedRelease;
    } catch (error) {
      this.logManager.logError(
        'Error fetching latest release:',
        error as Error
      );
      return this.cachedRelease;
    }
  }
}
