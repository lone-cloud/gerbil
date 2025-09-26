import { execa } from 'execa';

import { formatDeviceName } from '@/utils/format';

let vulkanInfoCache: {
  discreteGPUs: {
    deviceName: string;
    driverInfo?: string;
    apiVersion?: string;
    hasAMD: boolean;
    hasNVIDIA: boolean;
  }[];
  apiVersion?: string;
} | null = null;

// eslint-disable-next-line sonarjs/cognitive-complexity
export async function getVulkanInfo() {
  if (vulkanInfoCache) {
    return vulkanInfoCache;
  }

  try {
    const { stdout } = await execa('vulkaninfo', ['--summary'], {
      timeout: 3000,
      reject: false,
    });

    const discreteGPUs: {
      deviceName: string;
      driverInfo?: string;
      apiVersion?: string;
      hasAMD: boolean;
      hasNVIDIA: boolean;
    }[] = [];
    let globalApiVersion: string | undefined;

    if (stdout.trim()) {
      const lines = stdout.split('\n');
      let foundDiscreteGPU = false;
      let currentGPU: (typeof discreteGPUs)[0] | null = null;

      for (const line of lines) {
        if (
          !globalApiVersion &&
          line.includes('apiVersion') &&
          line.includes('=')
        ) {
          const match = line.match(/=\s*(\d+\.\d+(?:\.\d+)?)/);
          if (match) {
            globalApiVersion = match[1];
          }
        }

        if (line.includes('PHYSICAL_DEVICE_TYPE_DISCRETE_GPU')) {
          foundDiscreteGPU = true;
          currentGPU = {
            deviceName: '',
            hasAMD: false,
            hasNVIDIA: false,
          };
        } else if (
          foundDiscreteGPU &&
          currentGPU &&
          line.includes('deviceName') &&
          line.includes('=')
        ) {
          const parts = line.split('=');
          if (parts.length >= 2) {
            const name = parts[1]?.trim();
            if (name) {
              currentGPU.deviceName = name;
              currentGPU.hasAMD =
                name.toLowerCase().includes('amd') ||
                name.toLowerCase().includes('radeon');
              currentGPU.hasNVIDIA =
                name.toLowerCase().includes('nvidia') ||
                name.toLowerCase().includes('geforce') ||
                name.toLowerCase().includes('rtx') ||
                name.toLowerCase().includes('gtx');
            }
          }
        } else if (
          foundDiscreteGPU &&
          currentGPU &&
          line.includes('driverInfo')
        ) {
          const mesaMatch = line.match(/Mesa\s+(.+)/);
          if (mesaMatch) {
            currentGPU.driverInfo = `Mesa ${mesaMatch[1].trim()}`;
          }
        } else if (
          foundDiscreteGPU &&
          currentGPU &&
          line.includes('apiVersion') &&
          line.includes('=')
        ) {
          const match = line.match(/=\s*(\d+\.\d+(?:\.\d+)?)/);
          if (match) {
            currentGPU.apiVersion = match[1];
            if (!globalApiVersion) {
              globalApiVersion = match[1];
            }
          }
        } else if (foundDiscreteGPU && currentGPU && line.includes('GPU')) {
          if (currentGPU.deviceName) {
            discreteGPUs.push(currentGPU);
          }
          foundDiscreteGPU = false;
          currentGPU = null;
        }
      }

      if (foundDiscreteGPU && currentGPU && currentGPU.deviceName) {
        discreteGPUs.push(currentGPU);
      }
    }

    vulkanInfoCache = {
      discreteGPUs,
      apiVersion: globalApiVersion,
    };

    return vulkanInfoCache;
  } catch {
    vulkanInfoCache = {
      discreteGPUs: [],
    };
    return vulkanInfoCache;
  }
}

export async function detectLinuxGPUViaVulkan() {
  try {
    const vulkanInfo = await getVulkanInfo();

    let hasAMD = false;
    let hasNVIDIA = false;
    const gpuInfo: string[] = [];

    for (const gpu of vulkanInfo.discreteGPUs) {
      gpuInfo.push(formatDeviceName(gpu.deviceName));

      if (gpu.hasAMD) {
        hasAMD = true;
      }
      if (gpu.hasNVIDIA) {
        hasNVIDIA = true;
      }
    }

    return {
      hasAMD,
      hasNVIDIA,
      gpuInfo: gpuInfo.length > 0 ? gpuInfo : [],
    };
  } catch {
    return {
      hasAMD: false,
      hasNVIDIA: false,
      gpuInfo: [],
    };
  }
}

export async function detectVulkan() {
  try {
    const vulkanInfo = await getVulkanInfo();

    const devices: string[] = [];

    for (const gpu of vulkanInfo.discreteGPUs) {
      devices.push(formatDeviceName(gpu.deviceName));
    }

    return {
      supported: devices.length > 0,
      devices,
      version: vulkanInfo.apiVersion || 'Unknown',
    };
  } catch {
    return { supported: false, devices: [], version: 'Unknown' };
  }
}
