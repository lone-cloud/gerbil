/* eslint-disable no-comments/disallowComments */
import si from 'systeminformation';
import { safeExecute } from '@/utils/node/logging';
import { getGPUData } from '@/utils/node/gpu';
import type {
  CPUCapabilities,
  GPUCapabilities,
  BasicGPUInfo,
  GPUMemoryInfo,
} from '@/types/hardware';
import { execa } from 'execa';
import { formatDeviceName } from '@/utils/format';
import { platform } from 'process';

let cpuCapabilitiesCache: CPUCapabilities | null = null;
let basicGPUInfoCache: BasicGPUInfo | null = null;
let gpuCapabilitiesCache: GPUCapabilities | null = null;
let gpuMemoryInfoCache: GPUMemoryInfo[] | null = null;

export async function detectCPU() {
  if (cpuCapabilitiesCache) {
    return cpuCapabilitiesCache;
  }

  const result = await safeExecute(async () => {
    const [cpu, flags] = await Promise.all([si.cpu(), si.cpuFlags()]);

    const devices: string[] = [];
    if (cpu.brand) {
      devices.push(
        `${formatDeviceName(cpu.brand)} (${cpu.physicalCores} cores, ${cpu.speed} GHz)`
      );
    }

    const avx = flags.includes('avx') || flags.includes('AVX');
    const avx2 = flags.includes('avx2') || flags.includes('AVX2');

    const capabilities = {
      avx,
      avx2,
      devices,
    };

    cpuCapabilitiesCache = capabilities;
    return capabilities;
  }, 'CPU detection failed');

  const fallbackCapabilities = {
    avx: false,
    avx2: false,
    devices: [],
  };

  cpuCapabilitiesCache = result || fallbackCapabilities;
  return cpuCapabilitiesCache;
}

export async function detectGPU() {
  if (basicGPUInfoCache) {
    return basicGPUInfoCache;
  }

  const result = await safeExecute(async () => {
    const graphics = await si.graphics();

    let hasAMD = false;
    let hasNVIDIA = false;
    const gpuInfo: string[] = [];

    for (const controller of graphics.controllers) {
      // Check vendor for AMD
      if (
        controller.vendor?.toLowerCase().includes('amd') ||
        controller.vendor?.toLowerCase().includes('ati')
      ) {
        hasAMD = true;
      }

      if (controller.vendor?.toLowerCase().includes('nvidia')) {
        hasNVIDIA = true;
      }

      if (controller.model) {
        gpuInfo.push(controller.model);
      }
    }

    const basicInfo = {
      hasAMD,
      hasNVIDIA,
      gpuInfo: gpuInfo.length > 0 ? gpuInfo : ['No GPU information available'],
    };
    basicGPUInfoCache = basicInfo;
    return basicInfo;
  }, 'GPU detection failed');

  const fallbackGPUInfo = {
    hasAMD: false,
    hasNVIDIA: false,
    gpuInfo: ['GPU detection failed'],
  };

  basicGPUInfoCache = result || fallbackGPUInfo;
  return basicGPUInfoCache;
}

export async function detectGPUCapabilities() {
  // WARNING: we're not worrying about the users that update their system
  // during runtime and not restart. Should we be though?
  if (gpuCapabilitiesCache) {
    return gpuCapabilitiesCache;
  }

  const [cuda, rocm, vulkan, clblast] = await Promise.all([
    detectCUDA(),
    detectROCm(),
    detectVulkan(),
    detectCLBlast(),
  ]);

  gpuCapabilitiesCache = { cuda, rocm, vulkan, clblast };

  return gpuCapabilitiesCache;
}

async function detectCUDA() {
  try {
    const { stdout } = await execa(
      'nvidia-smi',
      ['--query-gpu=name,driver_version', '--format=csv,noheader,nounits'],
      {
        timeout: 5000,
        reject: false,
      }
    );

    if (stdout.trim()) {
      // Check for error messages that indicate nvidia-smi failed
      const errorPatterns = [
        'NVIDIA-SMI has failed',
        'No devices found',
        'Unable to determine the device handle',
        "couldn't communicate with the NVIDIA driver",
        'No NVIDIA GPU found',
      ];

      const hasError = errorPatterns.some((pattern) =>
        stdout.toLowerCase().includes(pattern.toLowerCase())
      );

      if (hasError) {
        return { supported: false, devices: [] } as const;
      }

      const lines = stdout.trim().split('\n');
      const devices: string[] = [];
      let version: string | undefined;

      for (const line of lines) {
        const parts = line.split(',');
        const rawName = parts[0]?.trim() || 'Unknown NVIDIA GPU';
        devices.push(formatDeviceName(rawName));

        if (!version && parts[1]?.trim()) {
          version = parts[1].trim();
        }
      }

      return {
        supported: devices.length > 0,
        devices,
        version,
      } as const;
    }

    return { supported: false, devices: [] } as const;
  } catch {
    return { supported: false, devices: [] };
  }
}

// eslint-disable-next-line sonarjs/cognitive-complexity
export async function detectROCm() {
  try {
    const rocminfoCommand = platform === 'win32' ? 'hipInfo' : 'rocminfo';
    const { stdout } = await execa(rocminfoCommand, [], {
      timeout: 5000,
      reject: false,
    });

    if (stdout.trim()) {
      const devices: string[] = [];

      if (platform === 'win32') {
        const lines = stdout.split('\n');

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (trimmedLine.startsWith('Name:')) {
            const name = trimmedLine.split('Name:')[1]?.trim();
            if (
              name &&
              !name.toLowerCase().includes('cpu') &&
              !devices.includes(formatDeviceName(name))
            ) {
              devices.push(formatDeviceName(name));
            }
          }
        }
      } else {
        const lines = stdout.split('\n');
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];

          if (line.includes('Marketing Name:')) {
            const name = line.split('Marketing Name:')[1]?.trim();
            if (name) {
              let deviceType = '';

              const searchRangeLines = 20;
              const searchStartIndex = Math.max(0, i - searchRangeLines);
              const searchEndIndex = Math.min(
                lines.length,
                i + searchRangeLines
              );

              for (
                let searchIndex = searchStartIndex;
                searchIndex < searchEndIndex;
                searchIndex++
              ) {
                if (lines[searchIndex].includes('Device Type:')) {
                  deviceType =
                    lines[searchIndex].split('Device Type:')[1]?.trim() || '';
                  break;
                }
              }

              if (deviceType !== 'CPU') {
                devices.push(formatDeviceName(name));
              }
            }
          }
        }
      }

      let version: string | undefined;
      try {
        const { stdout: amdSmiOutput } = await execa('amd-smi', {
          timeout: 3000,
          reject: false,
        });

        if (amdSmiOutput.trim()) {
          const match =
            amdSmiOutput.match(/ROCm version:\s*(\d+\.\d+\.\d+)/i) ||
            amdSmiOutput.match(/version\s*(\d+\.\d+\.\d+)/i) ||
            amdSmiOutput.match(/(\d+\.\d+\.\d+)/);
          if (match) {
            version = match[1];
          }
        }
      } catch {}

      return {
        supported: devices.length > 0,
        devices,
        version,
      };
    }

    return { supported: false, devices: [] };
  } catch {
    return { supported: false, devices: [] };
  }
}

async function detectVulkan() {
  try {
    const { stdout } = await execa('vulkaninfo', ['--summary'], {
      timeout: 5000,
      reject: false,
    });

    if (stdout.trim()) {
      const devices: string[] = [];
      const lines = stdout.split('\n');

      for (const line of lines) {
        if (line.includes('deviceName') && line.includes('=')) {
          const parts = line.split('=');
          if (parts.length >= 2) {
            const name = parts[1]?.trim();
            if (name) {
              devices.push(formatDeviceName(name));
            }
          }
        }
      }

      let version = 'Unknown';
      try {
        const apiVersionLine = lines.find(
          (line) => line.includes('apiVersion') && line.includes('=')
        );
        if (apiVersionLine) {
          const match = apiVersionLine.match(/=\s*(\d+\.\d+(?:\.\d+)?)/);
          if (match) {
            version = match[1];
          }
        }
      } catch {}

      return {
        supported: devices.length > 0,
        devices,
        version,
      };
    }

    return { supported: false, devices: [], version: 'Unknown' };
  } catch {
    return { supported: false, devices: [], version: 'Unknown' };
  }
}

function parseClInfoOutput(output: string) {
  const devices: string[] = [];
  const lines = output.split('\n');

  let currentPlatform = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line.includes('Platform Name:')) {
      currentPlatform = line.split('Platform Name:')[1]?.trim() || '';
      continue;
    }

    if (line.includes('Device Type:') && line.includes('GPU')) {
      const deviceName = findDeviceNameInClInfo(lines, i);

      if (deviceName && currentPlatform) {
        devices.push(formatDeviceName(deviceName));
      }
    }
  }

  return devices;
}

function findDeviceNameInClInfo(lines: string[], startIndex: number) {
  for (
    let j = startIndex + 1;
    j < Math.min(startIndex + 50, lines.length);
    j++
  ) {
    const nextLine = lines[j].trim();
    if (nextLine.includes('Board name:')) {
      return nextLine.split('Board name:')[1]?.trim() || '';
    }
  }

  for (
    let j = startIndex + 1;
    j < Math.min(startIndex + 100, lines.length);
    j++
  ) {
    const nextLine = lines[j].trim();
    if (nextLine.startsWith('Name:')) {
      return nextLine.split('Name:')[1]?.trim() || '';
    }
  }

  return '';
}

async function detectCLBlast() {
  try {
    const { stdout } = await execa('clinfo', [], {
      timeout: 3000,
      reject: false,
    });

    if (stdout.trim()) {
      const devices = parseClInfoOutput(stdout);

      let version = 'Unknown';
      try {
        const versionLine = stdout
          .split('\n')
          .find(
            (line) =>
              line.includes('OpenCL C version') ||
              line.includes('CL_DEVICE_OPENCL_C_VERSION')
          );
        if (versionLine) {
          const match = versionLine.match(/OpenCL C\s+(\d+\.\d+)/);
          if (match) {
            version = match[1];
          }
        }
      } catch {}

      return {
        supported: devices.length > 0,
        devices,
        version,
      };
    }

    return { supported: false, devices: [], version: 'Unknown' };
  } catch {
    return { supported: false, devices: [], version: 'Unknown' };
  }
}

export async function detectGPUMemory() {
  if (gpuMemoryInfoCache) {
    return gpuMemoryInfoCache;
  }

  const result = await safeExecute(async () => {
    const gpuData = await getGPUData();
    const memoryInfo: GPUMemoryInfo[] = [];

    for (const gpu of gpuData) {
      let vram: number | null = gpu.memoryTotal;

      if (!vram || vram <= 1) {
        vram = null;
      }

      memoryInfo.push({
        totalMemoryGB: vram,
      });
    }

    return memoryInfo;
  }, 'GPU memory detection failed');

  gpuMemoryInfoCache = result || [];
  return gpuMemoryInfoCache;
}

export const detectSystemMemory = async () => {
  try {
    const [memInfo, memLayout] = await Promise.all([si.mem(), si.memLayout()]);

    const totalGB = Math.round(memInfo.total / 1024 ** 3);

    let speed: number | undefined;
    let type: string | undefined;

    if (memLayout && memLayout.length > 0) {
      const populatedSlot = memLayout.find(
        (slot) =>
          slot.size > 0 &&
          ((slot.clockSpeed && slot.clockSpeed > 0) ||
            (slot.type && slot.type !== ''))
      );

      if (populatedSlot) {
        speed =
          populatedSlot.clockSpeed && populatedSlot.clockSpeed > 0
            ? populatedSlot.clockSpeed
            : undefined;
        type =
          populatedSlot.type && populatedSlot.type !== ''
            ? populatedSlot.type
            : undefined;
      }
    }

    return {
      totalGB,
      speed,
      type,
    };
  } catch {
    return {
      totalGB: Math.round((await si.mem()).total / 1024 ** 3),
    };
  }
};
