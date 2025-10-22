/* eslint-disable no-comments/disallowComments */
import {
  cpu as siCpu,
  mem as siMem,
  memLayout as siMemLayout,
} from 'systeminformation';
import { safeExecute } from '@/utils/node/logging';
import { getGPUData } from '@/utils/node/gpu';
import type {
  CPUCapabilities,
  GPUCapabilities,
  BasicGPUInfo,
  GPUMemoryInfo,
  GPUDevice,
} from '@/types/hardware';
import { execa } from 'execa';
import { formatDeviceName } from '@/utils/format';
import { platform } from 'process';
import { getVulkanInfo, detectGPUViaVulkan } from '@/utils/node/vulkan';

const COMMON_EXEC_OPTIONS = {
  timeout: 3000,
  reject: false,
};

let cpuCapabilitiesCache: CPUCapabilities | null = null;
let basicGPUInfoCache: BasicGPUInfo | null = null;
let gpuCapabilitiesCache: GPUCapabilities | null = null;
let gpuMemoryInfoCache: GPUMemoryInfo[] | null = null;

export async function detectCPU() {
  if (cpuCapabilitiesCache) {
    return cpuCapabilitiesCache;
  }

  const result = await safeExecute(async () => {
    const cpu = await siCpu();

    const devices: { name: string; detailedName: string }[] = [];
    if (cpu.brand) {
      const name = formatDeviceName(cpu.brand);

      devices.push({
        name,
        detailedName: `${name} (${cpu.cores} cores) @ ${cpu.speed} GHz`,
      });
    }

    const capabilities = {
      devices,
    };

    cpuCapabilitiesCache = capabilities;
    return capabilities;
  }, 'CPU detection failed');

  cpuCapabilitiesCache = result || {
    devices: [],
  };

  return cpuCapabilitiesCache;
}

export async function detectGPU() {
  if (basicGPUInfoCache) {
    return basicGPUInfoCache;
  }

  const result = await safeExecute(
    () => detectGPUViaVulkan(),
    'GPU detection failed'
  );

  const fallbackGPUInfo = {
    hasAMD: false,
    hasNVIDIA: false,
    gpuInfo: [],
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

async function detectVulkan() {
  try {
    const vulkanInfo = await getVulkanInfo();

    const devices: GPUDevice[] = [];

    for (const gpu of vulkanInfo.allGPUs) {
      const isIntegrated = gpu.isIntegrated;

      devices.push({
        name: isIntegrated ? gpu.name : formatDeviceName(gpu.name),
        isIntegrated,
      });
    }

    return {
      devices,
      version: vulkanInfo.apiVersion || 'Unknown',
    };
  } catch {
    return { devices: [], version: 'Unknown' };
  }
}

async function detectCUDA() {
  try {
    const { stdout } = await execa(
      'nvidia-smi',
      ['--query-gpu=name,driver_version', '--format=csv,noheader'],
      COMMON_EXEC_OPTIONS
    );

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
        return { devices: [] } as const;
      }

      const lines = stdout.split('\n').filter((line) => line.trim());
      const devices: string[] = [];
      let driverVersion: string | undefined;

      for (const line of lines) {
        const [name, driver] = line.split(',').map((s) => s.trim());
        if (name) {
          devices.push(formatDeviceName(name));
        }
        if (driver && !driverVersion) {
          driverVersion = driver;
        }
      }

      return {
        devices,
        driverVersion,
      } as const;
    }

    return { devices: [] } as const;
  } catch {
    return { devices: [] };
  }
}

// eslint-disable-next-line sonarjs/cognitive-complexity
export async function detectROCm() {
  try {
    const rocminfoCommand = platform === 'win32' ? 'hipInfo' : 'rocminfo';
    const [rocminfoResult, vulkanInfo, hipccVersion] = await Promise.all([
      execa(rocminfoCommand, [], COMMON_EXEC_OPTIONS),
      getVulkanInfo(),
      execa('hipcc', ['--version'], COMMON_EXEC_OPTIONS),
    ]);
    const { stdout } = rocminfoResult;
    const { stdout: hipccOutput } = hipccVersion;
    let version: string | undefined;
    let driverVersion: string | undefined;

    try {
      if (hipccOutput.trim()) {
        const hipVersionMatch = hipccOutput.match(
          /HIP version:\s*(\d+\.\d+(?:\.\d+)?)/i
        );

        if (hipVersionMatch) {
          version = hipVersionMatch[1];
        }
      }
    } catch {}

    if (stdout.trim()) {
      const devices = parseRocmOutput(stdout, vulkanInfo);

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
      } else {
        try {
          for (const gpu of vulkanInfo.allGPUs) {
            if (gpu.driverInfo && !gpu.isIntegrated) {
              driverVersion = gpu.driverInfo;
              break;
            }
          }
        } catch {}
      }

      return {
        devices,
        version,
        driverVersion,
      };
    }

    return { devices: [] };
  } catch {
    return { devices: [] };
  }
}

function parseClInfoOutput(output: string) {
  const devices: GPUDevice[] = [];
  const lines = output.split('\n');

  let currentPlatform = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line.includes('Platform Name')) {
      currentPlatform = line.split('Platform Name')[1]?.trim() || '';
      continue;
    }

    if (line.includes('Device Type') && line.includes('GPU')) {
      const deviceName = findDeviceNameInClInfo(lines, i);
      const computeUnits = findComputeUnitsInClInfo(lines, i);

      if (deviceName && currentPlatform) {
        const isIntegrated = !isDiscreteGPU(computeUnits);

        devices.push({
          name: isIntegrated ? deviceName : formatDeviceName(deviceName),
          isIntegrated,
        });
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
    if (nextLine.includes('Device Board Name (AMD)')) {
      return nextLine.split('Device Board Name (AMD)')[1]?.trim() || '';
    }
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
    if (nextLine.startsWith('Device Name:')) {
      return nextLine.split('Device Name:')[1]?.trim() || '';
    }
    if (nextLine.startsWith('Name:')) {
      return nextLine.split('Name:')[1]?.trim() || '';
    }
  }

  return '';
}

function findComputeUnitsInClInfo(lines: string[], startIndex: number) {
  for (
    let j = startIndex + 1;
    j < Math.min(startIndex + 50, lines.length);
    j++
  ) {
    const nextLine = lines[j].trim();
    if (nextLine.includes('Max compute units')) {
      const units = nextLine
        .split('Max compute units')[1]
        ?.trim()
        .replace(/^:?\s*/, '');
      return units ? parseInt(units, 10) : 0;
    }
  }
  return 0;
}

const isDiscreteGPU = (computeUnits: number) => computeUnits > 12;

function parseRocmOutput(output: string, vulkanInfo: { allGPUs: GPUDevice[] }) {
  const devices: GPUDevice[] = [];
  const lines = output.split('\n');
  let currentDevice: Partial<GPUDevice> | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();

    // Handle hipInfo format
    if (handleHipInfoLine(trimmedLine, currentDevice, devices)) {
      currentDevice = trimmedLine.startsWith('device#') ? {} : currentDevice;
      continue;
    }

    // Handle rocminfo format
    if (line.includes('Marketing Name:')) {
      const device = parseRocmInfoDevice(line, lines, i, vulkanInfo);
      if (device) {
        devices.push(device);
      }
    }
  }

  // Add the last device for hipInfo format
  if (currentDevice?.name) {
    devices.push(
      createDevice(currentDevice.name, currentDevice.isIntegrated || false)
    );
  }

  return devices;
}

function handleHipInfoLine(
  trimmedLine: string,
  currentDevice: Partial<GPUDevice> | null,
  devices: GPUDevice[]
): boolean {
  if (trimmedLine.startsWith('device#')) {
    if (currentDevice?.name) {
      devices.push(
        createDevice(currentDevice.name, currentDevice.isIntegrated || false)
      );
    }
    return true;
  }

  if (currentDevice) {
    if (trimmedLine.startsWith('Name:')) {
      currentDevice.name = trimmedLine.split('Name:')[1]?.trim();
    } else if (trimmedLine.startsWith('isIntegrated:')) {
      const value = trimmedLine.split('isIntegrated:')[1]?.trim();
      currentDevice.isIntegrated = value === '1';
    }
    return true;
  }

  return false;
}

function parseRocmInfoDevice(
  line: string,
  lines: string[],
  index: number,
  vulkanInfo: { allGPUs: GPUDevice[] }
) {
  const name = line.split('Marketing Name:')[1]?.trim();
  if (!name) return null;

  const deviceType = findDeviceType(lines, index);
  if (deviceType === 'CPU') return null;

  const isIntegrated = determineIfIntegrated(name, vulkanInfo);
  return createDevice(name, isIntegrated);
}

const createDevice = (name: string, isIntegrated: boolean) => ({
  name: isIntegrated ? name : formatDeviceName(name),
  isIntegrated,
});

function findDeviceType(lines: string[], startIndex: number) {
  const searchRangeLines = 20;
  const searchStartIndex = Math.max(0, startIndex - searchRangeLines);
  const searchEndIndex = Math.min(lines.length, startIndex + searchRangeLines);

  for (
    let searchIndex = searchStartIndex;
    searchIndex < searchEndIndex;
    searchIndex++
  ) {
    if (lines[searchIndex].includes('Device Type:')) {
      return lines[searchIndex].split('Device Type:')[1]?.trim() || '';
    }
  }
  return '';
}

function determineIfIntegrated(
  name: string,
  vulkanInfo: { allGPUs: GPUDevice[] }
): boolean {
  try {
    const matchingGPU = vulkanInfo.allGPUs.find(
      (gpu) => gpu.name.includes(name) || name.includes(gpu.name)
    );
    return matchingGPU ? matchingGPU.isIntegrated : false;
  } catch {
    return false;
  }
}

async function detectCLBlast() {
  try {
    const { stdout } = await execa('clinfo', [], COMMON_EXEC_OPTIONS);

    if (stdout.trim()) {
      return {
        devices: parseClInfoOutput(stdout),
        version: 'Available',
      };
    }

    return { devices: [], version: 'Unknown' };
  } catch {
    return { devices: [], version: 'Unknown' };
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
