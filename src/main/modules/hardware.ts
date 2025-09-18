/* eslint-disable no-comments/disallowComments */
import si from 'systeminformation';
import { safeExecute } from '@/utils/node/logger';
import { terminateProcess } from '@/utils/node/process';
import { getGPUData } from '@/utils/node/gpu';
import type {
  CPUCapabilities,
  GPUCapabilities,
  BasicGPUInfo,
  GPUMemoryInfo,
  HardwareDetectionResult,
} from '@/types/hardware';
import { spawn } from 'child_process';
import { formatDeviceName } from '@/utils/format';

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
      devices.push(formatDeviceName(cpu.brand));
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
    const gpuData = await getGPUData();

    let hasAMD = false;
    let hasNVIDIA = false;
    const gpuInfo: string[] = [];

    for (const gpu of gpuData) {
      if (gpu.deviceName) {
        gpuInfo.push(formatDeviceName(gpu.deviceName));
      }

      const deviceName = gpu.deviceName?.toLowerCase() || '';

      if (
        deviceName.includes('amd') ||
        deviceName.includes('ati') ||
        deviceName.includes('radeon')
      ) {
        hasAMD = true;
      }

      if (
        deviceName.includes('nvidia') ||
        deviceName.includes('geforce') ||
        deviceName.includes('gtx') ||
        deviceName.includes('rtx')
      ) {
        hasNVIDIA = true;
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
    const nvidia = spawn(
      'nvidia-smi',
      ['--query-gpu=name,memory.total,memory.free', '--format=csv,noheader'],
      { timeout: 5000 }
    );

    let output = '';
    nvidia.stdout.on('data', (data) => {
      output += data.toString();
    });

    return new Promise<HardwareDetectionResult>((resolve) => {
      nvidia.on('close', (code) => {
        if (code === 0 && output.trim()) {
          const devices = output
            .trim()
            .split('\n')
            .map((line) => {
              const parts = line.split(',');
              const rawName = parts[0]?.trim() || 'Unknown NVIDIA GPU';
              return formatDeviceName(rawName);
            })
            .filter(Boolean);

          resolve({
            supported: devices.length > 0,
            devices,
          });
        } else {
          resolve({ supported: false, devices: [] });
        }
      });

      nvidia.on('error', () => {
        resolve({ supported: false, devices: [] });
      });

      setTimeout(async () => {
        await terminateProcess(nvidia);
        resolve({ supported: false, devices: [] });
      }, 5000);
    });
  } catch {
    return { supported: false, devices: [] };
  }
}

async function findRocminfoCommand() {
  const platform = await import('process').then((p) => p.platform);

  if (platform === 'win32') {
    return 'hipInfo';
  } else {
    return 'rocminfo';
  }
}

export async function detectROCm() {
  try {
    const rocminfoCommand = await findRocminfoCommand();
    if (!rocminfoCommand) {
      return { supported: false, devices: [] };
    }

    const isWindows = rocminfoCommand.includes('hipInfo');
    const rocminfo = spawn(rocminfoCommand, [], { timeout: 5000 });

    let output = '';
    rocminfo.stdout.on('data', (data) => {
      output += data.toString();
    });

    return new Promise<HardwareDetectionResult>((resolve) => {
      // eslint-disable-next-line sonarjs/cognitive-complexity
      rocminfo.on('close', (code) => {
        if (code === 0 && output.trim()) {
          const devices: string[] = [];

          if (isWindows) {
            const lines = output.split('\n');

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
            const lines = output.split('\n');
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
                        lines[searchIndex].split('Device Type:')[1]?.trim() ||
                        '';
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

          resolve({
            supported: devices.length > 0,
            devices,
          });
        } else {
          resolve({ supported: false, devices: [] });
        }
      });

      rocminfo.on('error', () => {
        resolve({ supported: false, devices: [] });
      });

      setTimeout(async () => {
        await terminateProcess(rocminfo);
        resolve({ supported: false, devices: [] });
      }, 5000);
    });
  } catch {
    return { supported: false, devices: [] };
  }
}

async function detectVulkan() {
  try {
    const vulkaninfo = spawn('vulkaninfo', ['--summary'], { timeout: 5000 });

    let output = '';
    vulkaninfo.stdout.on('data', (data) => {
      output += data.toString();
    });

    return new Promise<HardwareDetectionResult>((resolve) => {
      vulkaninfo.on('close', (code) => {
        if (code === 0 && output.trim()) {
          const devices: string[] = [];
          const lines = output.split('\n');

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

          resolve({
            supported: devices.length > 0,
            devices,
          });
        } else {
          resolve({ supported: false, devices: [] });
        }
      });

      vulkaninfo.on('error', () => {
        resolve({ supported: false, devices: [] });
      });

      setTimeout(async () => {
        await terminateProcess(vulkaninfo);
        resolve({ supported: false, devices: [] });
      }, 5000);
    });
  } catch {
    return { supported: false, devices: [] };
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
    const clinfo = spawn('clinfo', [], { timeout: 3000 });

    let output = '';
    clinfo.stdout.on('data', (data) => {
      output += data.toString();
    });

    return new Promise<HardwareDetectionResult>((resolve) => {
      clinfo.on('close', (code) => {
        if (code === 0 && output.trim()) {
          const devices = parseClInfoOutput(output);
          resolve({
            supported: devices.length > 0,
            devices,
          });
        } else {
          resolve({ supported: false, devices: [] });
        }
      });

      clinfo.on('error', () => {
        resolve({ supported: false, devices: [] });
      });

      setTimeout(async () => {
        await terminateProcess(clinfo);
        resolve({ supported: false, devices: [] });
      }, 3000);
    });
  } catch {
    return { supported: false, devices: [] };
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
      if (gpu.deviceName) {
        let vram: number | null = gpu.memoryTotal;

        if (!vram || vram <= 1) {
          vram = null;
        }

        memoryInfo.push({
          deviceName: formatDeviceName(gpu.deviceName),
          totalMemoryGB: vram,
        });
      }
    }

    return memoryInfo;
  }, 'GPU memory detection failed');

  gpuMemoryInfoCache = result || [];
  return gpuMemoryInfoCache;
}
