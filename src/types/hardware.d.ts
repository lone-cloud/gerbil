export interface CPUCapabilities {
  devices: { name: string; detailedName: string }[];
}

export interface GPUMemoryInfo {
  totalMemoryGB: string | null;
}

export interface SystemMemoryInfo {
  totalGB: string;
  speed?: number;
  type?: string;
}

export interface GPUDevice {
  readonly name: string;
  readonly isIntegrated: boolean;
}

export interface GPUCapabilities {
  cuda: {
    readonly devices: readonly string[];
    readonly version?: string;
    readonly driverVersion?: string;
  };
  rocm: {
    readonly devices: readonly GPUDevice[];
    readonly version?: string;
    readonly driverVersion?: string;
  };
  vulkan: {
    readonly devices: readonly GPUDevice[];
    readonly version?: string;
  };
  clblast: {
    readonly devices: readonly GPUDevice[];
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
