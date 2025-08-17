import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { LogManager } from '@/main/managers/LogManager';

export interface BackendSupport {
  rocm: boolean;
  vulkan: boolean;
  clblast: boolean;
  noavx2: boolean;
  failsafe: boolean;
  cuda: boolean;
}

export class BinaryService {
  private backendSupportCache = new Map<string, BackendSupport>();
  private logManager: LogManager;

  constructor(logManager: LogManager) {
    this.logManager = logManager;
  }

  detectBackendSupport(koboldBinaryPath: string): BackendSupport {
    if (this.backendSupportCache.has(koboldBinaryPath)) {
      return this.backendSupportCache.get(koboldBinaryPath)!;
    }

    const support: BackendSupport = {
      rocm: false,
      vulkan: false,
      clblast: false,
      noavx2: false,
      failsafe: false,
      cuda: false,
    };

    try {
      const binaryDir = dirname(koboldBinaryPath);
      const internalDir = join(binaryDir, '_internal');

      if (!existsSync(internalDir)) {
        // eslint-disable-next-line no-console
        console.warn(
          '_internal directory not found, cannot detect backend support'
        );
        this.backendSupportCache.set(koboldBinaryPath, support);
        return support;
      }

      const platform = process.platform;
      const isDynamicLib = (name: string) => {
        if (platform === 'win32') {
          return existsSync(join(internalDir, `${name}.dll`));
        } else {
          return existsSync(join(internalDir, `${name}.so`));
        }
      };

      support.rocm = isDynamicLib('koboldcpp_hipblas');
      support.vulkan = isDynamicLib('koboldcpp_vulkan');
      support.clblast = isDynamicLib('koboldcpp_clblast');
      support.noavx2 = isDynamicLib('koboldcpp_noavx2');
      support.failsafe = isDynamicLib('koboldcpp_failsafe');
      support.cuda = isDynamicLib('koboldcpp_cublas');
    } catch (error) {
      this.logManager.logError(
        'Error detecting backend support:',
        error as Error
      );
    }

    this.backendSupportCache.set(koboldBinaryPath, support);
    return support;
  }

  getAvailableBackends(
    koboldBinaryPath: string,
    hardwareCapabilities?: {
      cuda: { supported: boolean; devices: string[] };
      rocm: { supported: boolean; devices: string[] };
      vulkan: { supported: boolean; devices: string[] };
      clblast: { supported: boolean; devices: string[] };
    }
  ): Array<{ value: string; label: string; devices?: string[] }> {
    const backendSupport = this.detectBackendSupport(koboldBinaryPath);
    const backends: Array<{
      value: string;
      label: string;
      devices?: string[];
    }> = [];

    if (backendSupport.cuda && hardwareCapabilities?.cuda.supported) {
      backends.push({
        value: 'cuda',
        label: 'CUDA',
        devices: hardwareCapabilities.cuda.devices,
      });
    }

    if (backendSupport.rocm && hardwareCapabilities?.rocm.supported) {
      backends.push({
        value: 'rocm',
        label: 'ROCm',
        devices: hardwareCapabilities.rocm.devices,
      });
    }

    if (backendSupport.vulkan && hardwareCapabilities?.vulkan.supported) {
      backends.push({
        value: 'vulkan',
        label: 'Vulkan',
        devices: hardwareCapabilities.vulkan.devices,
      });
    }

    if (backendSupport.clblast && hardwareCapabilities?.clblast.supported) {
      backends.push({
        value: 'clblast',
        label: 'CLBlast',
        devices: hardwareCapabilities.clblast.devices,
      });
    }

    backends.push({
      value: 'cpu',
      label: 'CPU',
    });

    return backends;
  }

  clearCache(): void {
    this.backendSupportCache.clear();
  }
}
