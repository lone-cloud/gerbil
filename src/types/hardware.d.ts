export interface CPUCapabilities {
  devices: string[];
}

export interface GPUMemoryInfo {
  totalMemoryGB: string | null;
}

export interface SystemMemoryInfo {
  totalGB: string;
  speed?: number;
  type?: string;
}

export interface GPUCapabilities {
  cuda: {
    readonly devices: readonly string[];
    readonly version?: string;
    readonly driverVersion?: string;
  };
  rocm: {
    readonly devices: readonly string[];
    readonly version?: string;
    readonly driverVersion?: string;
  };
  vulkan: {
    readonly devices: readonly string[];
    readonly version?: string;
  };
  clblast: {
    readonly devices: readonly CLBlastDevice[];
    readonly version?: string;
  };
}

export interface BasicGPUInfo {
  hasAMD: boolean;
  hasNVIDIA: boolean;
  gpuInfo: string[];
}

export interface CLBlastDevice {
  readonly name: string;
  readonly isIntegrated: boolean;
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
