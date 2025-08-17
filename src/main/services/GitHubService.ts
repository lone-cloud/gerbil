import type { GitHubRelease } from '@/types/electron';
import { LogManager } from '@/main/managers/LogManager';
import { GITHUB_API } from '@/constants';

export class GitHubService {
  private lastApiCall = 0;
  private apiCooldown = 60000;
  private cachedRelease: GitHubRelease | null = null;
  private cachedReleases: GitHubRelease[] = [];
  private logManager: LogManager;

  constructor(logManager: LogManager) {
    this.logManager = logManager;
  }

  async getLatestRelease(): Promise<GitHubRelease | null> {
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

  async getAllReleases(): Promise<GitHubRelease[]> {
    const now = Date.now();

    if (
      now - this.lastApiCall < this.apiCooldown &&
      this.cachedReleases.length > 0
    ) {
      return this.cachedReleases;
    }

    try {
      const response = await fetch(GITHUB_API.ALL_RELEASES_URL);

      if (!response.ok) {
        if (response.status === 403) {
          // eslint-disable-next-line no-console
          console.warn(
            'GitHub API rate limit reached, using cached data if available'
          );
          return this.cachedReleases;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      this.lastApiCall = now;
      this.cachedReleases = (await response.json()) as GitHubRelease[];
      return this.cachedReleases;
    } catch (error) {
      this.logManager.logError('Error fetching releases:', error as Error);
      return this.cachedReleases;
    }
  }
}
