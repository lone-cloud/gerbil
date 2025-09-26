import { GPUDevice } from './hardware';

export interface ConfigFile {
  name: string;
  path: string;
  size: number;
}

export type InterfaceTab = 'terminal' | 'chat-text' | 'chat-image';

export type ChatMode = 'text' | 'image';

export type SdConvDirectMode = 'off' | 'vaeonly' | 'full';

export type FrontendPreference =
  | 'koboldcpp'
  | 'sillytavern'
  | 'openwebui'
  | 'comfyui';

export type Screen = 'welcome' | 'download' | 'launch' | 'interface';

export interface GitHubAsset {
  name: string;
  browser_download_url: string;
  size: number;
  version?: string;
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
  actualVersion?: string;
}

export interface VersionInfo {
  name: string;
  version: string;
  size?: number;
  isInstalled: boolean;
  isCurrent: boolean;
  downloadUrl?: string;
  installedPath?: string;
  hasUpdate?: boolean;
  newerVersion?: string;
  actualVersion?: string;
}

export interface DismissedUpdate {
  currentVersionPath: string;
  targetVersion: string;
}

export interface SelectOption {
  value: string;
  label: string;
}

export interface BackendOption extends SelectOption {
  readonly devices?: readonly (string | GPUDevice)[];
  readonly disabled?: boolean;
}

export interface BackendSupport {
  rocm: boolean;
  vulkan: boolean;
  clblast: boolean;
  noavx2: boolean;
  failsafe: boolean;
  cuda: boolean;
}
