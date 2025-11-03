import type { SystemVersionInfo } from '@/types/electron';
import { PRODUCT_NAME } from '@/constants';
import type { InfoItem } from '@/components/InfoCard';
import type { HardwareInfo } from '@/types/hardware';

export const createSoftwareItems = (
  versionInfo: SystemVersionInfo,
  koboldVersion?: string | null
) => [
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
  ...(koboldVersion ? [{ label: 'KoboldCpp', value: koboldVersion }] : []),
  {
    label: 'OS',
    value: `${versionInfo.platform} ${versionInfo.arch} (${versionInfo.osVersion})`,
  },
  { label: 'Electron', value: versionInfo.electronVersion },
  {
    label: 'Node.js',
    value:
      versionInfo.nodeJsSystemVersion &&
      versionInfo.nodeJsSystemVersion !== versionInfo.nodeVersion
        ? `${versionInfo.nodeVersion} (system: ${versionInfo.nodeJsSystemVersion})`
        : versionInfo.nodeVersion,
  },
  { label: 'Chromium', value: versionInfo.chromeVersion },
  { label: 'V8', value: versionInfo.v8Version },
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

  if (gpuCapabilities.cuda.driverVersion) {
    items.push({
      label: 'NVIDIA',
      value: gpuCapabilities.cuda.driverVersion,
    });
  }

  if (gpuCapabilities.cuda.devices.length > 0) {
    items.push({
      label: 'CUDA',
      value: gpuCapabilities.cuda.version
        ? gpuCapabilities.cuda.version
        : 'Available',
    });
  }

  if (gpuCapabilities.rocm.driverVersion) {
    items.push({
      label: 'AMD',
      value: gpuCapabilities.rocm.driverVersion,
    });
  }

  if (gpuCapabilities.rocm.devices.length > 0) {
    items.push({
      label: 'ROCm',
      value: gpuCapabilities.rocm.version
        ? gpuCapabilities.rocm.version
        : 'Available',
    });
  }

  if (gpuCapabilities.vulkan.devices.length > 0) {
    items.push({
      label: 'Vulkan',
      value: gpuCapabilities.vulkan.version
        ? gpuCapabilities.vulkan.version
        : 'Available',
    });
  } else {
    items.push({
      label: 'Vulkan',
      value: 'Not available',
    });
  }

  if (gpuCapabilities.clblast.devices.length > 0) {
    items.push({
      label: 'CLBlast',
      value: gpuCapabilities.clblast.version
        ? gpuCapabilities.clblast.version
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
        ? hardwareInfo.cpu.devices[0].detailedName
        : 'Unknown',
  },
  {
    label: 'RAM',
    value: hardwareInfo.systemMemory
      ? `${hardwareInfo.systemMemory.totalGB} GB${
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
  ...(() => {
    const discreteGPUs = [];

    if (hardwareInfo.gpuCapabilities.vulkan.devices.length > 0) {
      discreteGPUs.push(
        ...hardwareInfo.gpuCapabilities.vulkan.devices.filter(
          (gpu) => !gpu.isIntegrated
        )
      );
    }
    if (hardwareInfo.gpuCapabilities.rocm.devices.length > 0) {
      discreteGPUs.push(
        ...hardwareInfo.gpuCapabilities.rocm.devices.filter(
          (gpu) => !gpu.isIntegrated
        )
      );
    }
    if (hardwareInfo.gpuCapabilities.clblast.devices.length > 0) {
      discreteGPUs.push(
        ...hardwareInfo.gpuCapabilities.clblast.devices.filter(
          (gpu) => !gpu.isIntegrated
        )
      );
    }

    const uniqueDiscreteGPUs = discreteGPUs.filter(
      (gpu, index, arr) => arr.findIndex((g) => g.name === gpu.name) === index
    );

    return uniqueDiscreteGPUs.length > 0
      ? uniqueDiscreteGPUs.map((gpu, index) => ({
          label: `GPU ${index > 0 ? index + 1 : ''}`.trim(),
          value: gpu.name,
        }))
      : [{ label: 'GPU', value: 'No discrete GPU detected' }];
  })(),
  ...(hardwareInfo.gpuMemory && hardwareInfo.gpuMemory.length > 0
    ? hardwareInfo.gpuMemory.map((mem, index) => ({
        label: `VRAM ${index > 0 ? index + 1 : ''}`.trim(),
        value: mem.totalMemoryGB ? `${mem.totalMemoryGB} GB` : 'Unknown',
      }))
    : []),
];
