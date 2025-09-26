import { execa } from 'execa';

import { formatDeviceName } from '@/utils/format';

let vulkanInfoCache: {
  allGPUs: {
    deviceName: string;
    driverInfo?: string;
    apiVersion?: string;
    hasAMD: boolean;
    hasNVIDIA: boolean;
    isIntegrated: boolean;
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

    const allGPUs: {
      deviceName: string;
      driverInfo?: string;
      apiVersion?: string;
      hasAMD: boolean;
      hasNVIDIA: boolean;
      isIntegrated: boolean;
    }[] = [];
    let globalApiVersion: string | undefined;

    if (stdout.trim()) {
      const lines = stdout.split('\n');
      let foundGPU = false;
      let currentGPU: (typeof allGPUs)[0] | null = null;

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

        if (
          line.includes('PHYSICAL_DEVICE_TYPE_DISCRETE_GPU') ||
          line.includes('PHYSICAL_DEVICE_TYPE_INTEGRATED_GPU')
        ) {
          foundGPU = true;
          const isIntegrated = line.includes(
            'PHYSICAL_DEVICE_TYPE_INTEGRATED_GPU'
          );
          currentGPU = {
            deviceName: '',
            hasAMD: false,
            hasNVIDIA: false,
            isIntegrated,
          };
        } else if (
          foundGPU &&
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
        } else if (foundGPU && currentGPU && line.includes('driverInfo')) {
          const mesaMatch = line.match(/Mesa\s+(.+)/);
          if (mesaMatch) {
            currentGPU.driverInfo = `Mesa ${mesaMatch[1].trim()}`;
          }
        } else if (
          foundGPU &&
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
        } else if (foundGPU && currentGPU && line.includes('GPU')) {
          if (currentGPU.deviceName) {
            allGPUs.push(currentGPU);
          }
          foundGPU = false;
          currentGPU = null;
        }
      }

      if (foundGPU && currentGPU && currentGPU.deviceName) {
        allGPUs.push(currentGPU);
      }
    }

    vulkanInfoCache = {
      allGPUs,
      apiVersion: globalApiVersion,
    };

    return vulkanInfoCache;
  } catch {
    vulkanInfoCache = {
      allGPUs: [],
    };
    return vulkanInfoCache;
  }
}

export async function detectGPUViaVulkan() {
  try {
    const vulkanInfo = await getVulkanInfo();

    let hasAMD = false;
    let hasNVIDIA = false;
    const gpuInfo: string[] = [];

    for (const gpu of vulkanInfo.allGPUs.filter((g) => !g.isIntegrated)) {
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
