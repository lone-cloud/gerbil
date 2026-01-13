import { GPUDevice } from './hardware';

export interface ConfigFile {
  name: string;
  path: string;
  size: number;
}

export type InterfaceTab = 'terminal' | 'chat-text' | 'chat-image';

export type ChatMode = 'text' | 'image';

export type SdConvDirectMode = 'off' | 'vaeonly' | 'full';

export type FrontendPreference = 'koboldcpp' | 'llamacpp' | 'sillytavern' | 'openwebui';

export type ImageGenerationFrontendPreference = 'match' | 'builtin';

export type Screen = 'welcome' | 'download' | 'launch' | 'interface';

export type ModelParamType =
  | 'model'
  | 'sdmodel'
  | 'sdt5xxl'
  | 'sdclipl'
  | 'sdclipg'
  | 'sdphotomaker'
  | 'sdvae'
  | 'sdlora'
  | 'mmproj'
  | 'whispermodel'
  | 'draftmodel'
  | 'ttsmodel'
  | 'ttswavtokenizer'
  | 'embeddingsmodel';

export interface CachedModel {
  path: string;
  author: string;
  model: string;
}

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

export interface BackendInfo {
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
  currentBackendPath: string;
  targetVersion: string;
}

export interface SelectOption {
  value: string;
  label: string;
}

export interface AccelerationOption extends SelectOption {
  readonly devices?: readonly (string | GPUDevice)[];
  readonly disabled?: boolean;
}

export interface AccelerationSupport {
  rocm: boolean;
  vulkan: boolean;
  clblast: boolean;
  noavx2: boolean;
  failsafe: boolean;
  cuda: boolean;
}

export type Acceleration = keyof AccelerationSupport | 'cpu';

export interface ModelAnalysis {
  general: {
    architecture: string;
    name?: string;
    fileSize: string;
    parameterCount?: string;
  };
  context: {
    maxContextLength?: string;
  };
  architecture: {
    layers?: number;
    expertCount?: number;
  };
  estimates: {
    fullGpuVram: string;
    systemRam: string;
    vramPerLayer?: string;
  };
}

export interface HuggingFaceModelInfo {
  id: string;
  name: string;
  author: string;
  downloads: number;
  likes: number;
  updatedAt: Date;
  gated: boolean | 'auto' | 'manual';
  paramSize?: string;
}

export interface HuggingFaceFileInfo {
  path: string;
  size: number;
}

export interface HuggingFaceSearchParams {
  search?: string;
  pipelineTag?: string;
  filter?: string;
  sort: HuggingFaceSortOption;
}

export type HuggingFaceSortOption = 'trendingScore' | 'downloads' | 'likes' | 'lastModified';
