import type { GitHubRelease } from '../../types/electron';

export class GitHubService {
  private lastApiCall = 0;
  private apiCooldown = 60000; // 1 minute cooldown
  private cachedRelease: GitHubRelease | null = null;
  private cachedReleases: GitHubRelease[] = [];

  async getLatestRelease(): Promise<GitHubRelease | null> {
    const now = Date.now();
    if (now - this.lastApiCall < this.apiCooldown && this.cachedRelease) {
      return this.cachedRelease;
    }

    try {
      const response = await fetch(
        'https://api.github.com/repos/LostRuins/koboldcpp/releases/latest'
      );

      if (!response.ok) {
        if (response.status === 403) {
          console.warn(
            'GitHub API rate limit reached, using cached data or fallback'
          );
          return this.cachedRelease || this.getFallbackRelease();
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      this.lastApiCall = now;
      this.cachedRelease = (await response.json()) as GitHubRelease;
      return this.cachedRelease;
    } catch (error) {
      console.error('Error fetching latest release:', error);
      return this.cachedRelease || this.getFallbackRelease();
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
      const response = await fetch(
        'https://api.github.com/repos/LostRuins/koboldcpp/releases'
      );

      if (!response.ok) {
        if (response.status === 403) {
          console.warn('GitHub API rate limit reached, using cached data');
          return this.cachedReleases.length > 0
            ? this.cachedReleases
            : [this.getFallbackRelease()];
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      this.lastApiCall = now;
      this.cachedReleases = (await response.json()) as GitHubRelease[];
      return this.cachedReleases;
    } catch (error) {
      console.error('Error fetching releases:', error);
      return this.cachedReleases.length > 0
        ? this.cachedReleases
        : [this.getFallbackRelease()];
    }
  }

  private getFallbackRelease(): GitHubRelease {
    return {
      tag_name: 'v1.70.1',
      name: 'KoboldCpp v1.70.1 (Fallback)',
      published_at: new Date().toISOString(),
      body: 'Fallback release data - GitHub API unavailable',
      assets: [
        {
          name: 'koboldcpp-linux-x64',
          browser_download_url: 'https://koboldai.org/cpp',
          size: 50000000,
          created_at: new Date().toISOString(),
        },
        {
          name: 'koboldcpp-linux-x64-rocm',
          browser_download_url: 'https://koboldai.org/cpplinuxrocm',
          size: 80000000,
          created_at: new Date().toISOString(),
        },
      ],
    };
  }
}
