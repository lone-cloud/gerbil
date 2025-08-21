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
  private availableBackendsCache = new Map<
    string,
    Array<{ value: string; label: string; devices?: string[] }>
  >();
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

      const platform = process.platform;
      const libExtension = platform === 'win32' ? '.dll' : '.so';

      const hasKoboldCppLib = (name: string) => {
        const filename = `${name}${libExtension}`;
        return existsSync(join(internalDir, filename));
      };

      support.rocm = hasKoboldCppLib('koboldcpp_hipblas');
      support.vulkan = hasKoboldCppLib('koboldcpp_vulkan');
      support.clblast = hasKoboldCppLib('koboldcpp_clblast');
      support.noavx2 = hasKoboldCppLib('koboldcpp_noavx2');
      support.failsafe = hasKoboldCppLib('koboldcpp_failsafe');
      support.cuda = hasKoboldCppLib('koboldcpp_cublas');
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
    const cacheKey = `${koboldBinaryPath}:${JSON.stringify(hardwareCapabilities)}`;

    if (this.availableBackendsCache.has(cacheKey)) {
      return this.availableBackendsCache.get(cacheKey)!;
    }

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

    this.availableBackendsCache.set(cacheKey, backends);
    return backends;
  }

  clearCache(): void {
    this.backendSupportCache.clear();
    this.availableBackendsCache.clear();
  }
}
