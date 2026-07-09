import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { platform } from 'node:process';

import { execa } from 'execa';
import { graphics as siGraphics } from 'systeminformation';

import { formatDeviceName } from '@/utils/format';

const ICD_SEARCH_DIRS = ['/usr/share/vulkan/icd.d', '/etc/vulkan/icd.d'];

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

  if (platform === 'linux') {
    try {
      const runtimeFound = await hasVulkanRuntimeLinux();
      if (runtimeFound) {
        const fallback = await gpusFromSystemInfo();
        if (fallback) {
          vulkanInfoCache = {
            allGPUs: fallback.allGPUs,
            apiVersion: fallback.apiVersion,
          };
          return vulkanInfoCache;
        }
      }
    } catch {}
  }

  vulkanInfoCache = { allGPUs: [] };
  return vulkanInfoCache;
}

async function hasVulkanRuntimeLinux() {
  for (const dir of ICD_SEARCH_DIRS) {
    try {
      const entries = await readdir(dir);
      if (entries.some((e) => e.endsWith('.json'))) return true;
    } catch {}
  }
  return false;
}

async function gpusFromSystemInfo() {
  try {
    const [graphicsResult, apiVersion] = await Promise.all([
      siGraphics(),
      getVulkanVersionFromICD(),
    ]);
    const { controllers } = graphicsResult;
    const allGPUs = controllers
      .filter((c) => c.vendor && c.model)
      .map((c) => {
        const vendorLower = (c.vendor ?? '').toLowerCase();
        const nameLower = c.model.toLowerCase();
        const hasAMD = /amd|ati|radeon/.test(vendorLower) || /amd|radeon/.test(nameLower);
        const hasNVIDIA = /nvidia/.test(vendorLower) || /nvidia|geforce|rtx|gtx/.test(nameLower);
        return {
          hasAMD,
          hasNVIDIA,
          isIntegrated: c.vramDynamic,
          name: c.model,
        };
      });

    return { allGPUs, apiVersion };
  } catch {
    return null;
  }
}

async function getVulkanVersionFromICD() {
  for (const dir of ICD_SEARCH_DIRS) {
    try {
      const entries = await readdir(dir);
      for (const entry of entries) {
        if (!entry.endsWith('.json')) continue;
        try {
          const content = await readFile(join(dir, entry), 'utf8');
          const parsed = JSON.parse(content) as {
            ICD?: { api_version?: string };
          };
          if (parsed.ICD?.api_version) {
            return parsed.ICD.api_version;
          }
        } catch {}
      }
    } catch {}
  }
  return undefined;
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
