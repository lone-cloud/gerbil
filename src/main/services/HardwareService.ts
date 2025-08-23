/* eslint-disable no-comments/disallowComments */
import si from 'systeminformation';
import { shortenDeviceName } from '@/utils';
import { LogManager } from '@/main/managers/LogManager';
import type {
  CPUCapabilities,
  GPUCapabilities,
  BasicGPUInfo,
  HardwareInfo,
  GPUMemoryInfo,
} from '@/types/hardware';

export class HardwareService {
  private cpuCapabilitiesCache: CPUCapabilities | null = null;
  private basicGPUInfoCache: BasicGPUInfo | null = null;
  private gpuCapabilitiesCache: GPUCapabilities | null = null;
  private gpuMemoryInfoCache: GPUMemoryInfo[] | null = null;
  private logManager: LogManager;

  constructor(logManager: LogManager) {
    this.logManager = logManager;
  }

  async detectCPU(): Promise<CPUCapabilities> {
    if (this.cpuCapabilitiesCache) {
      return this.cpuCapabilitiesCache;
    }

    try {
      const [cpu, flags] = await Promise.all([si.cpu(), si.cpuFlags()]);

      const devices: string[] = [];
      if (cpu.brand) {
        devices.push(shortenDeviceName(cpu.brand));
      }

      const avx = flags.includes('avx') || flags.includes('AVX');
      const avx2 = flags.includes('avx2') || flags.includes('AVX2');

      this.cpuCapabilitiesCache = {
        avx,
        avx2,
        devices,
      };

      return this.cpuCapabilitiesCache;
    } catch (error) {
      this.logManager.logError('CPU detection failed:', error as Error);
      const fallbackCapabilities = {
        avx: false,
        avx2: false,
        devices: [],
      };
      this.cpuCapabilitiesCache = fallbackCapabilities;
      return fallbackCapabilities;
    }
  }

  async detectGPU(): Promise<BasicGPUInfo> {
    if (this.basicGPUInfoCache) {
      return this.basicGPUInfoCache;
    }

    try {
      const graphics = await si.graphics();

      let hasAMD = false;
      let hasNVIDIA = false;
      const gpuInfo: string[] = [];

      for (const controller of graphics.controllers) {
        if (controller.model) {
          gpuInfo.push(shortenDeviceName(controller.model));
        }

        const vendor = controller.vendor?.toLowerCase() || '';
        const model = controller.model?.toLowerCase() || '';

        if (
          vendor.includes('amd') ||
          vendor.includes('ati') ||
          model.includes('radeon') ||
          model.includes('amd')
        ) {
          hasAMD = true;
        }

        if (
          vendor.includes('nvidia') ||
          model.includes('nvidia') ||
          model.includes('geforce') ||
          model.includes('gtx') ||
          model.includes('rtx')
        ) {
          hasNVIDIA = true;
        }
      }

      this.basicGPUInfoCache = {
        hasAMD,
        hasNVIDIA,
        gpuInfo:
          gpuInfo.length > 0 ? gpuInfo : ['No GPU information available'],
      };

      return this.basicGPUInfoCache;
    } catch (error) {
      this.logManager.logError('GPU detection failed:', error as Error);
      const fallbackGPUInfo = {
        hasAMD: false,
        hasNVIDIA: false,
        gpuInfo: ['GPU detection failed'],
      };
      this.basicGPUInfoCache = fallbackGPUInfo;
      return fallbackGPUInfo;
    }
  }

  async detectGPUCapabilities(): Promise<GPUCapabilities> {
    // WARNING: we're not worrying about the users that update their system
    // during runtime and not restart. Should we be though?
    if (this.gpuCapabilitiesCache) {
      return this.gpuCapabilitiesCache;
    }

    const [cuda, rocm, vulkan, clblast] = await Promise.all([
      this.detectCUDA(),
      this.detectROCm(),
      this.detectVulkan(),
      this.detectCLBlast(),
    ]);

    this.gpuCapabilitiesCache = { cuda, rocm, vulkan, clblast };

    return this.gpuCapabilitiesCache;
  }

  async detectAll(): Promise<HardwareInfo> {
    const [cpu, gpu] = await Promise.all([this.detectCPU(), this.detectGPU()]);

    return { cpu, gpu };
  }

  async detectAllWithCapabilities(): Promise<HardwareInfo> {
    const [cpu, gpu, gpuCapabilities] = await Promise.all([
      this.detectCPU(),
      this.detectGPU(),
      this.detectGPUCapabilities(),
    ]);

    return { cpu, gpu, gpuCapabilities };
  }

  private async detectCUDA(): Promise<{
    supported: boolean;
    devices: string[];
  }> {
    try {
      const { spawn } = await import('child_process');
      const nvidia = spawn(
        'nvidia-smi',
        ['--query-gpu=name,memory.total,memory.free', '--format=csv,noheader'],
        { timeout: 5000 }
      );

      let output = '';
      nvidia.stdout.on('data', (data) => {
        output += data.toString();
      });

      return new Promise((resolve) => {
        nvidia.on('close', (code) => {
          if (code === 0 && output.trim()) {
            const devices = output
              .trim()
              .split('\n')
              .map((line) => {
                const parts = line.split(',');
                const rawName = parts[0]?.trim() || 'Unknown NVIDIA GPU';
                return shortenDeviceName(rawName);
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

        setTimeout(() => {
          try {
            nvidia.kill('SIGTERM');
          } catch {
            void 0;
          }
          resolve({ supported: false, devices: [] });
        }, 5000);
      });
    } catch {
      return { supported: false, devices: [] };
    }
  }

  async detectROCm(): Promise<{
    supported: boolean;
    devices: string[];
  }> {
    try {
      const { spawn } = await import('child_process');
      const rocminfo = spawn('rocminfo', [], { timeout: 5000 });

      let output = '';
      rocminfo.stdout.on('data', (data) => {
        output += data.toString();
      });

      return new Promise((resolve) => {
        // eslint-disable-next-line sonarjs/cognitive-complexity
        rocminfo.on('close', (code) => {
          if (code === 0 && output.trim()) {
            const devices: string[] = [];
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
                    devices.push(shortenDeviceName(name));
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

        setTimeout(() => {
          try {
            rocminfo.kill('SIGTERM');
          } catch {
            void 0;
          }
          resolve({ supported: false, devices: [] });
        }, 5000);
      });
    } catch {
      return { supported: false, devices: [] };
    }
  }

  private async detectVulkan(): Promise<{
    supported: boolean;
    devices: string[];
  }> {
    try {
      const { spawn } = await import('child_process');
      const vulkaninfo = spawn('vulkaninfo', ['--summary'], { timeout: 5000 });

      let output = '';
      vulkaninfo.stdout.on('data', (data) => {
        output += data.toString();
      });

      return new Promise((resolve) => {
        vulkaninfo.on('close', (code) => {
          if (code === 0 && output.trim()) {
            const devices: string[] = [];
            const lines = output.split('\n');

            for (const line of lines) {
              // Handle both formats: "deviceName = AMD Radeon RX 7900 GRE" and other potential formats
              if (line.includes('deviceName') && line.includes('=')) {
                const parts = line.split('=');
                if (parts.length >= 2) {
                  const name = parts[1]?.trim();
                  if (name) {
                    devices.push(shortenDeviceName(name));
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

        setTimeout(() => {
          try {
            vulkaninfo.kill('SIGTERM');
          } catch {
            void 0;
          }
          resolve({ supported: false, devices: [] });
        }, 5000);
      });
    } catch {
      return { supported: false, devices: [] };
    }
  }

  private parseClInfoOutput(output: string): string[] {
    const devices: string[] = [];
    const lines = output.split('\n');

    let currentPlatform = '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Extract platform name - this appears early in the output
      if (line.includes('Platform Name:')) {
        currentPlatform = line.split('Platform Name:')[1]?.trim() || '';
        continue;
      }

      // When we find a GPU device type, look for device name
      if (line.includes('Device Type:') && line.includes('GPU')) {
        const deviceName = this.findDeviceNameInClInfo(lines, i);

        if (deviceName && currentPlatform) {
          const deviceLabel = `${shortenDeviceName(deviceName)} (${currentPlatform})`;
          devices.push(deviceLabel);
        }
      }
    }

    return devices;
  }

  private findDeviceNameInClInfo(lines: string[], startIndex: number): string {
    // Look for Board name first (appears closer to Device Type and is more descriptive)
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

    // If no Board name found, look for Name: field (appears much later)
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

  private async detectCLBlast(): Promise<{
    supported: boolean;
    devices: string[];
  }> {
    try {
      const { spawn } = await import('child_process');
      const clinfo = spawn('clinfo', [], { timeout: 3000 });

      let output = '';
      clinfo.stdout.on('data', (data) => {
        output += data.toString();
      });

      return new Promise((resolve) => {
        clinfo.on('close', (code) => {
          if (code === 0 && output.trim()) {
            const devices = this.parseClInfoOutput(output);
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

        setTimeout(() => {
          try {
            clinfo.kill('SIGTERM');
          } catch {
            void 0;
          }
          resolve({ supported: false, devices: [] });
        }, 3000);
      });
    } catch {
      return { supported: false, devices: [] };
    }
  }

  async detectGPUMemory(): Promise<GPUMemoryInfo[]> {
    if (this.gpuMemoryInfoCache) {
      return this.gpuMemoryInfoCache;
    }

    const memoryInfo: GPUMemoryInfo[] = [];

    try {
      const graphics = await si.graphics();

      for (const controller of graphics.controllers) {
        if (controller.model) {
          let vram = controller.vram;
          // systeminformation returns 0 or 1 if unknown/invalid
          if (!vram || vram === 1) {
            vram = null;
          }
          memoryInfo.push({
            deviceName: shortenDeviceName(controller.model),
            totalMemoryMB: vram,
          });
        }
      }

      this.gpuMemoryInfoCache = memoryInfo;
    } catch (error) {
      this.logManager.logError('GPU memory detection failed:', error as Error);
      this.gpuMemoryInfoCache = [];
    }

    return this.gpuMemoryInfoCache;
  }
}
