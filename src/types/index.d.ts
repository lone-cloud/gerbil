export interface ConfigFile {
  name: string;
  path: string;
  size: number;
}

export type InterfaceTab = 'terminal' | 'chat';

export type SdConvDirectMode = 'off' | 'vaeonly' | 'full';

export type FrontendPreference = 'koboldcpp' | 'sillytavern';

export type ServerTabMode = 'chat' | 'image-generation';

export type Screen = 'welcome' | 'download' | 'launch' | 'interface';

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

export interface InstalledVersion {
  version: string;
  path: string;
  filename: string;
  size?: number;
}

export interface SelectOption {
  value: string;
  label: string;
}

export interface BackendOption extends SelectOption {
  devices?: string[];
  disabled?: boolean;
}
