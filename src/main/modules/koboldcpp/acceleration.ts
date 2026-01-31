import { dirname, join } from 'node:path';
import { platform } from 'node:process';
import type { AccelerationOption, AccelerationSupport } from '@/types';
import { pathExists } from '@/utils/node/fs';
import { safeExecute, tryExecute } from '@/utils/node/logging';
import { detectCPU, detectGPUCapabilities } from '../hardware';
import { getCurrentBinaryInfo } from './backend';

const accelerationSupportCache = new Map<string, AccelerationSupport>();
const availableAccelerationsCache = new Map<string, AccelerationOption[]>();

const CPU_LABEL = platform === 'darwin' ? 'Metal' : 'CPU';

async function detectAccelerationSupportFromPath(koboldBinaryPath: string) {
  const cached = accelerationSupportCache.get(koboldBinaryPath);
  if (cached) {
    return cached;
  }

  const support: AccelerationSupport = {
    rocm: false,
    vulkan: false,
    noavx2: false,
    failsafe: false,
    cuda: false,
  };

  await tryExecute(async () => {
    const binaryDir = dirname(koboldBinaryPath);
    const internalDir = join(binaryDir, '_internal');

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

    const [rocm, vulkan, noavx2, failsafe, cuda] = await Promise.all([
      hasKoboldCppLib('koboldcpp_hipblas'),
      hasKoboldCppLib('koboldcpp_vulkan'),
      hasKoboldCppLib('koboldcpp_noavx2'),
      hasKoboldCppLib('koboldcpp_failsafe'),
      hasKoboldCppLib('koboldcpp_cublas'),
    ]);

    support.rocm = rocm;
    support.vulkan = vulkan;
    support.noavx2 = noavx2;
    support.failsafe = failsafe;
    support.cuda = cuda;
  }, 'Error detecting acceleration support');

  accelerationSupportCache.set(koboldBinaryPath, support);
  return support;
}

export const detectAccelerationSupport = async () =>
  (await safeExecute(async () => {
    const currentBinaryInfo = await getCurrentBinaryInfo();

    if (!currentBinaryInfo?.path) {
      return null;
    }

    return detectAccelerationSupportFromPath(currentBinaryInfo.path);
  }, 'Error detecting current binary acceleration support')) || null;

export async function getAvailableAccelerations(includeDisabled = false) {
  if (platform === 'darwin') {
    return [{ value: 'cpu', label: CPU_LABEL }];
  }

  const result = await safeExecute(async () => {
    const [currentBinaryInfo, hardwareCapabilities, cpuCapabilities] = await Promise.all([
      getCurrentBinaryInfo(),
      detectGPUCapabilities(),
      includeDisabled ? detectCPU() : Promise.resolve(null),
    ]);

    if (!currentBinaryInfo?.path) {
      return [{ value: 'cpu', label: CPU_LABEL }];
    }

    const cacheKey = `${currentBinaryInfo.path}:${includeDisabled}`;

    const cached = availableAccelerationsCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const accelerationSupport = await detectAccelerationSupport();

    if (!accelerationSupport) {
      return [];
    }

    const accelerations: AccelerationOption[] = [];

    if (accelerationSupport.cuda) {
      const isSupported = hardwareCapabilities.cuda.devices.length > 0;
      if (isSupported || includeDisabled) {
        accelerations.push({
          value: 'cuda',
          label: 'CUDA',
          devices: hardwareCapabilities.cuda.devices,
          disabled: includeDisabled ? !isSupported : undefined,
        });
      }
    }

    if (accelerationSupport.rocm) {
      const isSupported = hardwareCapabilities.rocm.devices.length > 0;
      if (isSupported || includeDisabled) {
        accelerations.push({
          value: 'rocm',
          label: 'ROCm',
          devices: hardwareCapabilities.rocm.devices,
          disabled: includeDisabled ? !isSupported : undefined,
        });
      }
    }

    if (accelerationSupport.vulkan) {
      const isSupported = hardwareCapabilities.vulkan.devices.length > 0;
      if (isSupported || includeDisabled) {
        accelerations.push({
          value: 'vulkan',
          label: 'Vulkan',
          devices: hardwareCapabilities.vulkan.devices,
          disabled: includeDisabled ? !isSupported : undefined,
        });
      }
    }

    accelerations.push({
      value: 'cpu',
      label: CPU_LABEL,
      devices: cpuCapabilities?.devices.map((device) => device.name) || [],
      disabled: false,
    });

    if (includeDisabled) {
      accelerations.sort((a, b) => {
        if (a.disabled === b.disabled) return 0;
        return a.disabled ? 1 : -1;
      });
    }

    availableAccelerationsCache.set(cacheKey, accelerations);
    return accelerations;
  }, 'Failed to get available accelerations');

  return result || [{ value: 'cpu', label: CPU_LABEL }];
}
