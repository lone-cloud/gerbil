import type { InfoItem } from '@/components/InfoCard';
import { PRODUCT_NAME } from '@/constants';
import type { SystemVersionInfo } from '@/types/electron';
import type { GPUDevice, HardwareInfo } from '@/types/hardware';
import { formatDeviceName } from '@/utils/format';

export const createSoftwareItems = (
  versionInfo: SystemVersionInfo,
  koboldVersion?: string | null,
) => [
  {
    label: PRODUCT_NAME,
    value: versionInfo.aurPackageVersion
      ? (() => {
          const pkgrel = versionInfo.aurPackageVersion.split('-')[1];
          return pkgrel
            ? `${versionInfo.appVersion} (AUR${pkgrel !== '1' ? ` r${pkgrel}` : ''})`
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
      versionInfo.nodeJsSystemVersion && versionInfo.nodeJsSystemVersion !== versionInfo.nodeVersion
        ? `${versionInfo.nodeVersion} (system: ${versionInfo.nodeJsSystemVersion})`
        : versionInfo.nodeVersion,
  },
  { label: 'Chromium', value: versionInfo.chromeVersion },
  { label: 'V8', value: versionInfo.v8Version.replace(/-electron\.\d+$/, '') },
  ...(versionInfo.uvVersion ? [{ label: 'uv', value: versionInfo.uvVersion }] : []),
];

export const createHardwareItems = (hardwareInfo: HardwareInfo, ignoreIGPUs = true) => {
  const { gpuCapabilities } = hardwareInfo;
  const driverItems: InfoItem[] = [];

  if (gpuCapabilities) {
    if (gpuCapabilities.cuda.driverVersion) {
      driverItems.push({
        label: 'NVIDIA',
        value: gpuCapabilities.cuda.driverVersion,
      });
    }

    if (gpuCapabilities.cuda.devices.length > 0) {
      driverItems.push({
        label: 'CUDA',
        value: gpuCapabilities.cuda.version ?? 'Available',
      });
    }

    if (gpuCapabilities.rocm.driverVersion) {
      driverItems.push({
        label: 'AMD',
        value: gpuCapabilities.rocm.driverVersion,
      });
    }

    if (gpuCapabilities.rocm.devices.length > 0) {
      driverItems.push({
        label: 'ROCm',
        value: gpuCapabilities.rocm.version ?? 'Available',
      });
    }

    if (gpuCapabilities.vulkan.devices.length > 0) {
      driverItems.push({
        label: 'Vulkan',
        value: gpuCapabilities.vulkan.version ?? 'Available',
      });
    } else {
      driverItems.push({
        label: 'Vulkan',
        value: 'Not available',
      });
    }
  }

  return [
    {
      label: 'CPU',
      value:
        hardwareInfo.cpu.devices.length > 0 ? hardwareInfo.cpu.devices[0].detailedName : 'Unknown',
    },
    {
      label: 'RAM',
      value: hardwareInfo.systemMemory
        ? `${hardwareInfo.systemMemory.totalGB} GB${
            hardwareInfo.systemMemory.type ? ` ${hardwareInfo.systemMemory.type}` : ''
          }${hardwareInfo.systemMemory.speed ? ` @ ${hardwareInfo.systemMemory.speed} MHz` : ''}`
        : 'Detecting...',
    },
    ...(() => {
      if (!gpuCapabilities) {
        return [{ label: 'GPU', value: 'No discrete GPU detected' }];
      }

      const discreteGPUs: GPUDevice[] = [];

      if (gpuCapabilities.cuda.devices.length > 0) {
        discreteGPUs.push(
          ...gpuCapabilities.cuda.devices.map((name) => ({
            isIntegrated: false,
            name,
          })),
        );
      }
      const includeGpu = (gpu: GPUDevice) => !ignoreIGPUs || !gpu.isIntegrated;

      if (gpuCapabilities.vulkan.devices.length > 0) {
        for (const gpu of gpuCapabilities.vulkan.devices) {
          if (includeGpu(gpu)) {
            discreteGPUs.push({
              isIntegrated: gpu.isIntegrated,
              name: gpu.isIntegrated ? gpu.name : formatDeviceName(gpu.name),
            });
          }
        }
      }
      if (gpuCapabilities.rocm.devices.length > 0) {
        for (const gpu of gpuCapabilities.rocm.devices) {
          if (includeGpu(gpu)) {
            discreteGPUs.push({
              isIntegrated: gpu.isIntegrated,
              name: gpu.isIntegrated ? gpu.name : formatDeviceName(gpu.name),
            });
          }
        }
      }

      const uniqueDiscreteGPUs = discreteGPUs.filter(
        (gpu, index, arr) => arr.findIndex((g) => g.name === gpu.name) === index,
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
    ...driverItems,
  ];
};
