export interface CPUCapabilities {
  avx: boolean;
  avx2: boolean;
  devices: string[];
}

export interface GPUMemoryInfo {
  deviceName: string;
  totalMemoryGB: number | null;
}

export interface GPUCapabilities {
  cuda: {
    readonly supported: boolean;
    readonly devices: readonly string[];
  };
  rocm: {
    readonly supported: boolean;
    readonly devices: readonly string[];
  };
  vulkan: {
    readonly supported: boolean;
    readonly devices: readonly string[];
  };
  clblast: {
    readonly supported: boolean;
    readonly devices: readonly string[];
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
}

export interface SystemCapabilities {
  hardware: HardwareInfo;
  platform: string;
}
