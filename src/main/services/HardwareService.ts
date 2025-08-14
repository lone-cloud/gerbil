import si from 'systeminformation';
import type {
  CPUCapabilities,
  GPUCapabilities,
  BasicGPUInfo,
  HardwareInfo,
} from '@/types/hardware';

export class HardwareService {
  async detectCPU(): Promise<CPUCapabilities> {
    try {
      const [cpu, flags] = await Promise.all([si.cpu(), si.cpuFlags()]);

      const cpuInfo: string[] = [];
      if (cpu.brand) {
        cpuInfo.push(cpu.brand);
      }
      if (cpu.cores) {
        cpuInfo.push(`${cpu.cores} cores`);
      }
      if (cpu.speed) {
        cpuInfo.push(`${cpu.speed}GHz`);
      }

      const avx = flags.includes('avx') || flags.includes('AVX');
      const avx2 = flags.includes('avx2') || flags.includes('AVX2');

      return {
        avx,
        avx2,
        cpuInfo: cpuInfo.length > 0 ? cpuInfo : ['CPU information unavailable'],
      };
    } catch (error) {
      console.warn('CPU detection failed:', error);
      return {
        avx: false,
        avx2: false,
        cpuInfo: ['CPU detection failed'],
      };
    }
  }

  async detectGPU(): Promise<BasicGPUInfo> {
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

      return {
        hasAMD,
        hasNVIDIA,
        gpuInfo:
          gpuInfo.length > 0 ? gpuInfo : ['No GPU information available'],
      };
    } catch (error) {
      console.warn('GPU detection failed:', error);
      return {
        hasAMD: false,
        hasNVIDIA: false,
        gpuInfo: ['GPU detection failed'],
      };
    }
  }

  async detectGPUCapabilities(): Promise<GPUCapabilities> {
    const [cuda, rocm, vulkan, clblast] = await Promise.all([
      this.detectCUDA(),
      this.detectROCm(),
      this.detectVulkan(),
      this.detectCLBlast(),
    ]);

    return { cuda, rocm, vulkan, clblast };
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
            // Process already terminated
          }
          resolve({ supported: false, devices: [] });
        }, 5000);
      });
    } catch {
      return { supported: false, devices: [] };
    }
  }

  private async detectROCm(): Promise<{
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
        rocminfo.on('close', (code) => {
          if (code === 0 && output.trim()) {
            const devices: string[] = [];
            const lines = output.split('\n');

            for (let i = 0; i < lines.length; i++) {
              const line = lines[i];
              if (line.includes('Marketing Name:')) {
                const name = line.split('Marketing Name:')[1]?.trim();
                if (name && !name.includes('CPU')) {
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

        rocminfo.on('error', () => {
          resolve({ supported: false, devices: [] });
        });

        setTimeout(() => {
          try {
            rocminfo.kill('SIGTERM');
          } catch {
            // Process already terminated
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
            // Process already terminated
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
              // Failed to parse JSON, try text parsing
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
            // Process already terminated
          }
          resolve({ supported: false, devices: [] });
        }, 5000);
      });
    } catch {
      return { supported: false, devices: [] };
    }
  }
}
