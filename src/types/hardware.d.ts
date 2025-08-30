export interface CPUCapabilities {
  avx: boolean;
  avx2: boolean;
  devices: string[];
}

export interface GPUMemoryInfo {
  deviceName: string;
  totalMemoryMB: number | null;
}

export interface GPUCapabilities {
  cuda: {
    supported: boolean;
    devices: string[];
  };
  rocm: {
    supported: boolean;
    devices: string[];
  };
  vulkan: {
    supported: boolean;
    devices: string[];
  };
  clblast: {
    supported: boolean;
    devices: string[];
  };
}

export interface BasicGPUInfo {
  hasAMD: boolean;
  hasNVIDIA: boolean;
  gpuInfo: string[];
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
