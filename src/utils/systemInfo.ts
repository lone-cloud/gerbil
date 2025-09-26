import type { SystemVersionInfo } from '@/types/electron';
import type {
  CPUCapabilities,
  GPUCapabilities,
  BasicGPUInfo,
  GPUMemoryInfo,
  SystemMemoryInfo,
} from '@/types/hardware';
import { PRODUCT_NAME } from '@/constants';
import type { InfoItem } from '@/components/InfoCard';

export interface HardwareInfo {
  cpu: CPUCapabilities;
  gpu: BasicGPUInfo;
  gpuCapabilities: GPUCapabilities;
  gpuMemory: GPUMemoryInfo[];
  systemMemory: SystemMemoryInfo;
}

export const createSoftwareItems = (versionInfo: SystemVersionInfo) => [
  {
    label: PRODUCT_NAME,
    value: versionInfo.aurPackageVersion
      ? (() => {
          const pkgrel = versionInfo.aurPackageVersion.split('-')[1];
          return pkgrel
            ? `${versionInfo.appVersion} (AUR${pkgrel !== '1' ? ' r' + pkgrel : ''})`
            : versionInfo.appVersion;
        })()
      : versionInfo.appVersion,
  },
  { label: 'Electron', value: versionInfo.electronVersion },
  {
    label: 'Node.js',
    value: versionInfo.nodeJsSystemVersion
      ? `${versionInfo.nodeVersion} (System: ${versionInfo.nodeJsSystemVersion})`
      : versionInfo.nodeVersion,
  },
  { label: 'Chromium', value: versionInfo.chromeVersion },
  { label: 'V8', value: versionInfo.v8Version },
  {
    label: 'OS',
    value: `${versionInfo.platform} ${versionInfo.arch} (${versionInfo.osVersion})`,
  },
  ...(versionInfo.uvVersion
    ? [{ label: 'uv', value: versionInfo.uvVersion }]
    : []),
];

export const createDriverItems = (hardwareInfo: HardwareInfo) => {
  const items: InfoItem[] = [];
  const { gpuCapabilities } = hardwareInfo;

  if (!gpuCapabilities) {
    return [
      {
        label: 'Driver Support',
        value: 'Loading...',
      },
    ];
  }

  if (gpuCapabilities.cuda.supported) {
    items.push({
      label: 'CUDA',
      value: gpuCapabilities.cuda.version
        ? `v${gpuCapabilities.cuda.version}`
        : 'Available',
    });
  }

  if (gpuCapabilities.rocm.supported) {
    items.push({
      label: 'ROCm',
      value: gpuCapabilities.rocm.version
        ? `v${gpuCapabilities.rocm.version}`
        : 'Available',
    });
  }

  if (gpuCapabilities.vulkan.supported) {
    items.push({
      label: 'Vulkan',
      value: gpuCapabilities.vulkan.version
        ? `v${gpuCapabilities.vulkan.version}`
        : 'Available',
    });
  } else {
    items.push({
      label: 'Vulkan',
      value: 'Not available',
    });
  }

  if (gpuCapabilities.clblast.supported) {
    items.push({
      label: 'CLBlast',
      value: gpuCapabilities.clblast.version
        ? `v${gpuCapabilities.clblast.version}`
        : 'Available',
    });
  } else {
    items.push({
      label: 'CLBlast',
      value: 'Not available',
    });
  }

  return items;
};

export const createHardwareItems = (hardwareInfo: HardwareInfo) => [
  {
    label: 'CPU',
    value:
      hardwareInfo.cpu.devices.length > 0
        ? hardwareInfo.cpu.devices[0]
        : 'Unknown',
  },
  {
    label: 'RAM',
    value:
      hardwareInfo.systemMemory && hardwareInfo.systemMemory.totalGB > 0
        ? `${hardwareInfo.systemMemory.totalGB.toFixed(1)} GB${
            hardwareInfo.systemMemory.type
              ? ` ${hardwareInfo.systemMemory.type}`
              : ''
          }${
            hardwareInfo.systemMemory.speed
              ? ` @ ${hardwareInfo.systemMemory.speed} MHz`
              : ''
          }`
        : 'Detecting...',
  },
  ...(hardwareInfo.gpu.gpuInfo.length > 0
    ? hardwareInfo.gpu.gpuInfo.map((gpu, index) => ({
        label: `GPU ${index > 0 ? index + 1 : ''}`.trim(),
        value: gpu,
      }))
    : [{ label: 'GPU', value: 'No GPU detected' }]),
  ...(hardwareInfo.gpuMemory && hardwareInfo.gpuMemory.length > 0
    ? hardwareInfo.gpuMemory.map((mem, index) => ({
        label: `VRAM ${index > 0 ? index + 1 : ''}`.trim(),
        value: mem.totalMemoryGB
          ? `${mem.totalMemoryGB.toFixed(1)} GB`
          : 'Unknown',
      }))
    : []),
];
