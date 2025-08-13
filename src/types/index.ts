// Common interfaces used across multiple components
export interface ConfigFile {
  name: string;
  path: string;
  size: number;
}

export interface GitHubAsset {
  name: string;
  browser_download_url: string;
  size: number;
  created_at: string;
}

export interface GitHubRelease {
  tag_name: string;
  name: string;
  published_at: string;
  body: string;
  assets: GitHubAsset[];
}

export interface UpdateInfo {
  currentVersion: string;
  latestVersion: string;
  releaseInfo: GitHubRelease;
  hasUpdate: boolean;
}

export interface ReleaseWithStatus {
  release: GitHubRelease;
  availableAssets: Array<{
    asset: GitHubAsset;
    isDownloaded: boolean;
    installedVersion?: string;
  }>;
}

export interface InstalledVersion {
  version: string;
  path: string;
  downloadDate: string;
  filename: string;
}

export interface ROCmDownload {
  name: string;
  url: string;
  size: number;
}
