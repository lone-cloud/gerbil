import { platform } from 'node:process';

import { execa } from 'execa';
import { graphics as siGraphics } from 'systeminformation';

import { formatDeviceName } from '@/utils/format';

interface VulkanInfo {
  allGPUs: {
    name: string;
    driverInfo?: string;
    apiVersion?: string;
    hasAMD: boolean;
    hasNVIDIA: boolean;
    isIntegrated: boolean;
  }[];
  apiVersion?: string;
}

let vulkanInfoCache: VulkanInfo | null = null;

let vulkanInfoInflight: Promise<VulkanInfo> | null = null;

export function getVulkanInfo(): Promise<VulkanInfo> {
  if (vulkanInfoCache) {
    return Promise.resolve(vulkanInfoCache);
  }

  vulkanInfoInflight ??= fetchVulkanInfo().finally(() => {
    vulkanInfoInflight = null;
  });

  return vulkanInfoInflight;
}

async function fetchVulkanInfo(): Promise<VulkanInfo> {
  try {
    const { stdout } = await execa('vulkaninfo', ['--summary'], {
      reject: false,
      timeout: 3000,
    });

    const allGPUs: VulkanInfo['allGPUs'] = [];
    let globalApiVersion: string | undefined;

    if (stdout.trim()) {
      const lines = stdout.split('\n');
      let foundGPU = false;
      let currentGPU: VulkanInfo['allGPUs'][0] | null = null;

      for (const line of lines) {
        if (!globalApiVersion && line.includes('apiVersion') && line.includes('=')) {
          const match = /=\s*(?<version>\d+\.\d+(?:\.\d+)?)/.exec(line);
          if (match) {
            globalApiVersion = match[1];
          }
        }

        if (
          line.includes('PHYSICAL_DEVICE_TYPE_DISCRETE_GPU') ||
          line.includes('PHYSICAL_DEVICE_TYPE_INTEGRATED_GPU')
        ) {
          foundGPU = true;
          const isIntegrated = line.includes('PHYSICAL_DEVICE_TYPE_INTEGRATED_GPU');
          currentGPU = {
            hasAMD: false,
            hasNVIDIA: false,
            isIntegrated,
            name: '',
          };
        } else if (foundGPU && currentGPU && line.includes('deviceName') && line.includes('=')) {
          const parts = line.split('=');
          if (parts.length >= 2) {
            const name = parts[1]?.trim();
            if (name) {
              currentGPU.name = name;
              currentGPU.hasAMD =
                name.toLowerCase().includes('amd') || name.toLowerCase().includes('radeon');
              currentGPU.hasNVIDIA =
                name.toLowerCase().includes('nvidia') ||
                name.toLowerCase().includes('geforce') ||
                name.toLowerCase().includes('rtx') ||
                name.toLowerCase().includes('gtx');
            }
          }
        } else if (foundGPU && currentGPU && line.includes('driverInfo')) {
          const mesaMatch = /Mesa\s+(?<version>.+)/.exec(line);
          if (mesaMatch) {
            currentGPU.driverInfo = `Mesa ${mesaMatch[1].trim()}`;
          }
        } else if (foundGPU && currentGPU && line.includes('apiVersion') && line.includes('=')) {
          const match = /=\s*(?<version>\d+\.\d+(?:\.\d+)?)/.exec(line);
          if (match) {
            currentGPU.apiVersion = match[1];
            globalApiVersion ??= match[1];
          }
        } else if (foundGPU && currentGPU && line.includes('GPU')) {
          if (currentGPU.name) {
            allGPUs.push(currentGPU);
          }
          foundGPU = false;
          currentGPU = null;
        }
      }

      if (foundGPU && currentGPU && currentGPU.name) {
        allGPUs.push(currentGPU);
      }
    }

    if (allGPUs.length > 0) {
      vulkanInfoCache = {
        allGPUs,
        apiVersion: globalApiVersion,
      };

      return vulkanInfoCache;
    }
  } catch {}

  if (platform === 'win32') {
    try {
      const { controllers } = await Promise.race([
        siGraphics(),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000)),
      ]);
      const allGPUs = controllers
        .filter((c) => c.model)
        .map((c) => {
          const name = c.model ?? '';
          const vendor = (c.vendor ?? '').toLowerCase();
          const nameLower = name.toLowerCase();
          const hasNVIDIA =
            /nvidia|geforce|rtx|gtx/.test(vendor) || /nvidia|geforce|rtx|gtx/.test(nameLower);
          const hasAMD = /amd|advanced micro|radeon/.test(vendor) || /amd|radeon/.test(nameLower);
          const isIntegrated = c.vramDynamic;
          return { hasAMD, hasNVIDIA, isIntegrated, name };
        })
        .filter((c) => c.hasNVIDIA || c.hasAMD);
      vulkanInfoCache = { allGPUs };
      return vulkanInfoCache;
    } catch {}
  }

  vulkanInfoCache = { allGPUs: [] };
  return vulkanInfoCache;
}

export async function detectGPUViaVulkan() {
  try {
    const vulkanInfo = await getVulkanInfo();

    let hasAMD = false;
    let hasNVIDIA = false;
    const gpuInfo: string[] = [];

    for (const gpu of vulkanInfo.allGPUs.filter((g) => !g.isIntegrated)) {
      gpuInfo.push(formatDeviceName(gpu.name));

      if (gpu.hasAMD) {
        hasAMD = true;
      }
      if (gpu.hasNVIDIA) {
        hasNVIDIA = true;
      }
    }

    return {
      gpuInfo: gpuInfo.length > 0 ? gpuInfo : [],
      hasAMD,
      hasNVIDIA,
    };
  } catch {
    return {
      gpuInfo: [],
      hasAMD: false,
      hasNVIDIA: false,
    };
  }
}
