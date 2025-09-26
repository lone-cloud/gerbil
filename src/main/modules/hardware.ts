/* eslint-disable no-comments/disallowComments */
import {
  cpu as siCpu,
  cpuFlags,
  graphics as siGraphics,
  mem as siMem,
  memLayout as siMemLayout,
} from 'systeminformation';
import { safeExecute } from '@/utils/node/logging';
import { getGPUData, isDiscreteBusAddress } from '@/utils/node/gpu';
import type {
  CPUCapabilities,
  GPUCapabilities,
  BasicGPUInfo,
  GPUMemoryInfo,
} from '@/types/hardware';
import { execa } from 'execa';
import { formatDeviceName } from '@/utils/format';
import { platform } from 'process';

const COMMON_EXEC_OPTIONS = {
  timeout: 3000,
  reject: false,
};

let cpuCapabilitiesCache: CPUCapabilities | null = null;
let basicGPUInfoCache: BasicGPUInfo | null = null;
let gpuCapabilitiesCache: GPUCapabilities | null = null;
let gpuMemoryInfoCache: GPUMemoryInfo[] | null = null;
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

export async function detectCPU() {
  if (cpuCapabilitiesCache) {
    return cpuCapabilitiesCache;
  }

  const result = await safeExecute(async () => {
    const [cpu, flags] = await Promise.all([siCpu(), cpuFlags()]);

    const devices: string[] = [];
    if (cpu.brand) {
      devices.push(
        `${formatDeviceName(cpu.brand)} (${cpu.cores} cores) @ ${cpu.speed} GHz`
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
    if (platform === 'linux') {
      return detectLinuxGPUViaVulkan();
    } else {
      return detectGPUViaSI();
    }
  }, 'GPU detection failed');

  const fallbackGPUInfo = {
    hasAMD: false,
    hasNVIDIA: false,
    gpuInfo: ['GPU detection failed'],
  };

  basicGPUInfoCache = result || fallbackGPUInfo;
  return basicGPUInfoCache;
}

// eslint-disable-next-line sonarjs/cognitive-complexity
async function getVulkanInfo() {
  if (vulkanInfoCache) {
    return vulkanInfoCache;
  }

  try {
    const { stdout } = await execa(
      'vulkaninfo',
      ['--summary'],
      COMMON_EXEC_OPTIONS
    );

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

async function detectLinuxGPUViaVulkan() {
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
      gpuInfo: gpuInfo.length > 0 ? gpuInfo : ['No GPU information available'],
    };
  } catch {
    return {
      hasAMD: false,
      hasNVIDIA: false,
      gpuInfo: ['GPU detection failed'],
    };
  }
}

async function detectGPUViaSI() {
  const graphics = await siGraphics();

  let hasAMD = false;
  let hasNVIDIA = false;
  const gpuInfo: string[] = [];

  const discreteControllers = graphics.controllers.filter(
    (controller) =>
      controller.busAddress && isDiscreteBusAddress(controller.busAddress)
  );

  for (const controller of discreteControllers) {
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

  return {
    hasAMD,
    hasNVIDIA,
    gpuInfo: gpuInfo.length > 0 ? gpuInfo : ['No GPU information available'],
  };
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
    const { stdout } = await execa('nvidia-smi', [], COMMON_EXEC_OPTIONS);

    if (stdout.trim()) {
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

      const devices: string[] = [];
      let cudaVersion: string | undefined;
      let driverVersion: string | undefined;

      const cudaMatch = stdout.match(/CUDA Version:\s*(\d+\.\d+)/);
      if (cudaMatch) {
        cudaVersion = cudaMatch[1];
      }

      const driverMatch = stdout.match(
        /Driver Version:\s*(\d+\.\d+(?:\.\d+)?)/
      );

      if (driverMatch) {
        driverVersion = driverMatch[1];
      }

      const gpuNameMatch = stdout.match(/\|\s+\d+\s+([^|]+)\s+On\s+\|/g);

      if (gpuNameMatch) {
        for (const match of gpuNameMatch) {
          const name = match
            .replace(/\|\s+\d+\s+([^|]+)\s+On\s+\|/, '$1')
            .trim();
          if (name) {
            devices.push(formatDeviceName(name));
          }
        }
      }

      return {
        supported: devices.length > 0 || !!cudaVersion,
        devices,
        version: cudaVersion,
        driverVersion,
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
    const { stdout } = await execa(rocminfoCommand, [], COMMON_EXEC_OPTIONS);

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

      if (platform === 'linux' || platform === 'darwin') {
        try {
          const { stdout: amdSmiOutput } = await execa(
            'amd-smi',
            COMMON_EXEC_OPTIONS
          );

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
      } else {
        try {
          const { stdout: hipccOutput } = await execa(
            'hipcc',
            ['--version'],
            COMMON_EXEC_OPTIONS
          );

          if (hipccOutput.trim()) {
            const hipVersionMatch = hipccOutput.match(
              /HIP version:\s*(\d+\.\d+(?:\.\d+)?)/i
            );
            if (hipVersionMatch) {
              version = hipVersionMatch[1];
            }
          }
        } catch {}
      }

      let driverVersion: string | undefined;

      if (platform === 'win32') {
        try {
          const { stdout: driverOutput } = await execa(
            'powershell',
            [
              '-Command',
              `Get-CimInstance -ClassName Win32_VideoController | Where-Object { $_.Name -like '*AMD*' -or $_.Name -like '*Radeon*' } | Select-Object -First 1 -ExpandProperty DriverVersion`,
            ],
            COMMON_EXEC_OPTIONS
          );

          if (driverOutput.trim()) {
            driverVersion = driverOutput.trim();
          }
        } catch {}
      } else if (platform === 'linux') {
        try {
          const vulkanInfo = await getVulkanInfo();

          for (const gpu of vulkanInfo.discreteGPUs) {
            if (gpu.driverInfo) {
              driverVersion = gpu.driverInfo;
              break;
            }
          }
        } catch {}
      }

      return {
        supported: devices.length > 0,
        devices,
        version,
        driverVersion,
      };
    }

    return { supported: false, devices: [] };
  } catch {
    return { supported: false, devices: [] };
  }
}

async function detectVulkan() {
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
    const { stdout } = await execa('clinfo', [], COMMON_EXEC_OPTIONS);

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
    const gpuData = await getGPUData(true);
    const memoryInfo: GPUMemoryInfo[] = [];

    for (const gpu of gpuData) {
      let vram: number | null = gpu.memoryTotal;

      if (!vram || vram <= 1) {
        vram = null;
      }

      memoryInfo.push({
        totalMemoryGB: vram?.toFixed(2) || null,
      });
    }

    return memoryInfo;
  }, 'GPU memory detection failed');

  gpuMemoryInfoCache = result || [];
  return gpuMemoryInfoCache;
}

export const detectSystemMemory = async () => {
  try {
    const [memInfo, memLayout] = await Promise.all([siMem(), siMemLayout()]);

    const totalGB = (memInfo.total / 1024 ** 3).toFixed(2);

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
      totalGB: ((await siMem()).total / 1024 ** 3).toFixed(2),
    };
  }
};
