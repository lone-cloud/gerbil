/* eslint-disable no-comments/disallowComments */
import si from 'systeminformation';
import type {
  CPUCapabilities,
  GPUCapabilities,
  BasicGPUInfo,
  HardwareInfo,
} from '@/types/hardware';

export class HardwareService {
  private cpuCapabilitiesCache: CPUCapabilities | null = null;
  private basicGPUInfoCache: BasicGPUInfo | null = null;
  private gpuCapabilitiesCache: GPUCapabilities | null = null;

  async detectCPU(): Promise<CPUCapabilities> {
    if (this.cpuCapabilitiesCache) {
      return this.cpuCapabilitiesCache;
    }

    try {
      const [cpu, flags] = await Promise.all([si.cpu(), si.cpuFlags()]);

      const devices: string[] = [];
      if (cpu.brand) {
        devices.push(cpu.brand);
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
      console.warn('CPU detection failed:', error);
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
          gpuInfo.push(controller.model);
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
      console.warn('GPU detection failed:', error);
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
                return parts[0]?.trim() || 'Unknown NVIDIA GPU';
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
                    devices.push(name);
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
              if (line.includes('deviceName')) {
                const name = line.split('=')[1]?.trim();
                if (name) {
                  devices.push(name);
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

  private async detectCLBlast(): Promise<{
    supported: boolean;
    devices: string[];
  }> {
    try {
      const { spawn } = await import('child_process');
      const clinfo = spawn('clinfo', ['--json'], { timeout: 5000 });

      let output = '';
      clinfo.stdout.on('data', (data) => {
        output += data.toString();
      });

      return new Promise((resolve) => {
        // eslint-disable-next-line sonarjs/cognitive-complexity
        clinfo.on('close', (code) => {
          if (code === 0 && output.trim()) {
            try {
              const data = JSON.parse(output);
              const devices: string[] = [];

              if (data.platforms) {
                for (const platform of data.platforms) {
                  if (platform.devices) {
                    for (const device of platform.devices) {
                      if (device.name && device.type !== 'CPU') {
                        devices.push(device.name);
                      }
                    }
                  }
                }
              }

              resolve({
                supported: devices.length > 0,
                devices,
              });
            } catch {
              const lines = output.split('\n');
              const devices: string[] = [];

              for (const line of lines) {
                if (line.includes('Device Name') && !line.includes('CPU')) {
                  const name = line.split(':')[1]?.trim();
                  if (name) {
                    devices.push(name);
                  }
                }
              }

              resolve({
                supported: devices.length > 0,
                devices,
              });
            }
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
        }, 5000);
      });
    } catch {
      return { supported: false, devices: [] };
    }
  }
}
