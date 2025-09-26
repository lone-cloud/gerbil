export interface CPUCapabilities {
  avx: boolean;
  avx2: boolean;
  devices: string[];
}

export interface GPUMemoryInfo {
  totalMemoryGB: number | null;
}

export interface SystemMemoryInfo {
  totalGB: number;
  speed?: number;
  type?: string;
}

export interface GPUCapabilities {
  cuda: {
    readonly supported: boolean;
    readonly devices: readonly string[];
    readonly version?: string;
  };
  rocm: {
    readonly supported: boolean;
    readonly devices: readonly string[];
    readonly version?: string;
  };
  vulkan: {
    readonly supported: boolean;
    readonly devices: readonly string[];
    readonly version?: string;
  };
  clblast: {
    readonly supported: boolean;
    readonly devices: readonly string[];
    readonly version?: string;
  };
}

export interface BasicGPUInfo {
  hasAMD: boolean;
  hasNVIDIA: boolean;
  gpuInfo: string[];
}

export interface HardwareDetectionResult {
  readonly supported: boolean;
  readonly devices: readonly string[];
}

export interface HardwareInfo {
  cpu: CPUCapabilities;
  gpu: BasicGPUInfo;
  gpuCapabilities?: GPUCapabilities;
  gpuMemory?: GPUMemoryInfo[];
  systemMemory?: SystemMemoryInfo;
}
