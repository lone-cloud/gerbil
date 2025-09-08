import { join, dirname } from 'path';
import { pathExists } from '@/utils/fs';
import { getLogManager } from '@/main/managers/LogManager';
import { getHardwareManager } from '@/main/managers/HardwareManager';
import type { BackendOption, BackendSupport } from '@/types';
import type { KoboldCppManager } from '@/main/managers/KoboldCppManager';

export class BinaryManager {
  private backendSupportCache = new Map<string, BackendSupport>();
  private availableBackendsCache = new Map<string, BackendOption[]>();

  private async detectBackendSupportFromPath(
    koboldBinaryPath: string
  ): Promise<BackendSupport> {
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

      const hasKoboldCppLib = async (name: string): Promise<boolean> => {
        const filename = `${name}${libExtension}`;

        if (platform === 'win32') {
          return (
            (await pathExists(join(binaryDir, filename))) ||
            (await pathExists(join(internalDir, filename)))
          );
        } else {
          return (
            (await pathExists(join(internalDir, filename))) ||
            (await pathExists(join(binaryDir, filename)))
          );
        }
      };

      support.rocm = await hasKoboldCppLib('koboldcpp_hipblas');
      support.vulkan = await hasKoboldCppLib('koboldcpp_vulkan');
      support.clblast = await hasKoboldCppLib('koboldcpp_clblast');
      support.noavx2 = await hasKoboldCppLib('koboldcpp_noavx2');
      support.failsafe = await hasKoboldCppLib('koboldcpp_failsafe');
      support.cuda = await hasKoboldCppLib('koboldcpp_cublas');
    } catch (error) {
      getLogManager().logError(
        'Error detecting backend support:',
        error as Error
      );
    }

    this.backendSupportCache.set(koboldBinaryPath, support);
    return support;
  }

  async detectBackendSupport(
    koboldManager: KoboldCppManager
  ): Promise<BackendSupport | null> {
    try {
      const currentBinaryInfo = await koboldManager.getCurrentBinaryInfo();

      if (!currentBinaryInfo?.path) {
        return null;
      }

      return this.detectBackendSupportFromPath(currentBinaryInfo.path);
    } catch (error) {
      getLogManager().logError(
        'Error detecting current binary backend support:',
        error as Error
      );
      return null;
    }
  }

  // eslint-disable-next-line sonarjs/cognitive-complexity
  async getAvailableBackends(
    koboldManager: KoboldCppManager,
    includeDisabled = false
  ): Promise<BackendOption[]> {
    try {
      const hardwareManager = getHardwareManager();
      const [currentBinaryInfo, hardwareCapabilities, cpuCapabilities] =
        await Promise.all([
          koboldManager.getCurrentBinaryInfo(),
          hardwareManager.detectGPUCapabilities(),
          includeDisabled ? hardwareManager.detectCPU() : Promise.resolve(null),
        ]);

      if (!currentBinaryInfo?.path) {
        return [{ value: 'cpu', label: 'CPU' }];
      }

      const cacheKey = `${currentBinaryInfo.path}:${includeDisabled}`;

      if (this.availableBackendsCache.has(cacheKey)) {
        return this.availableBackendsCache.get(cacheKey)!;
      }

      const backendSupport = await this.detectBackendSupport(koboldManager);

      if (!backendSupport) {
        return [];
      }

      const backends: BackendOption[] = [];

      if (backendSupport.cuda) {
        const isSupported = hardwareCapabilities.cuda.supported;
        if (isSupported || includeDisabled) {
          backends.push({
            value: 'cuda',
            label: 'CUDA',
            devices: hardwareCapabilities.cuda.devices,
            disabled: includeDisabled ? !isSupported : undefined,
          });
        }
      }

      if (backendSupport.rocm) {
        const isSupported = hardwareCapabilities.rocm.supported;
        if (isSupported || includeDisabled) {
          backends.push({
            value: 'rocm',
            label: 'ROCm',
            devices: hardwareCapabilities.rocm.devices,
            disabled: includeDisabled ? !isSupported : undefined,
          });
        }
      }

      if (backendSupport.vulkan) {
        const isSupported = hardwareCapabilities.vulkan.supported;
        if (isSupported || includeDisabled) {
          backends.push({
            value: 'vulkan',
            label: 'Vulkan',
            devices: hardwareCapabilities.vulkan.devices,
            disabled: includeDisabled ? !isSupported : undefined,
          });
        }
      }

      if (backendSupport.clblast) {
        const isSupported = hardwareCapabilities.clblast.supported;
        if (isSupported || includeDisabled) {
          backends.push({
            value: 'clblast',
            label: 'CLBlast',
            devices: hardwareCapabilities.clblast.devices,
            disabled: includeDisabled ? !isSupported : undefined,
          });
        }
      }

      backends.push({
        value: 'cpu',
        label: 'CPU',
        devices: cpuCapabilities?.devices,
        disabled: false,
      });

      if (includeDisabled) {
        backends.sort((a, b) => {
          if (a.disabled === b.disabled) return 0;
          return a.disabled ? 1 : -1;
        });
      }

      this.availableBackendsCache.set(cacheKey, backends);
      return backends;
    } catch (error) {
      getLogManager().logError(
        'Failed to get available backends:',
        error as Error
      );
      return [{ value: 'cpu', label: 'CPU' }];
    }
  }

  clearCache(): void {
    this.backendSupportCache.clear();
    this.availableBackendsCache.clear();
  }
}

let binaryManagerInstance: BinaryManager;

export function getBinaryManager(): BinaryManager {
  if (!binaryManagerInstance) {
    binaryManagerInstance = new BinaryManager();
  }
  return binaryManagerInstance;
}
