import { dirname, join } from 'node:path';
import { platform } from 'node:process';

import { get as getConfig } from '@/main/modules/config';
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
    cuda: false,
    failsafe: false,
    noavx2: false,
    rocm: false,
    vulkan: false,
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
  }, 'Error detecting current binary acceleration support')) ?? null;

export async function getAvailableAccelerations(includeDisabled = false) {
  if (platform === 'darwin') {
    return [{ label: CPU_LABEL, value: 'cpu' }];
  }

  const result = await safeExecute(async () => {
    const currentBinaryInfo = await getCurrentBinaryInfo();

    if (!currentBinaryInfo?.path) {
      return [{ label: CPU_LABEL, value: 'cpu' }];
    }

    const ignoreIGPUs = getConfig('ignoreIGPUs') ?? true;
    const cacheKey = `${currentBinaryInfo.path}:${includeDisabled}:${ignoreIGPUs}`;

    const cached = availableAccelerationsCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const [hardwareCapabilities, cpuCapabilities, accelerationSupport] = await Promise.all([
      detectGPUCapabilities(),
      includeDisabled ? detectCPU() : Promise.resolve(null),
      detectAccelerationSupport(),
    ]);

    if (!accelerationSupport) {
      return [];
    }

    const accelerations: AccelerationOption[] = [];

    if (accelerationSupport.cuda) {
      const isSupported = hardwareCapabilities.cuda.devices.length > 0;
      if (isSupported || includeDisabled) {
        accelerations.push({
          devices: hardwareCapabilities.cuda.devices,
          disabled: includeDisabled ? !isSupported : undefined,
          label: 'CUDA',
          value: 'cuda',
        });
      }
    }

    if (accelerationSupport.rocm) {
      const devices = ignoreIGPUs
        ? hardwareCapabilities.rocm.devices.filter((d) => !d.isIntegrated)
        : hardwareCapabilities.rocm.devices;
      const isSupported = devices.length > 0;
      if (isSupported || includeDisabled) {
        accelerations.push({
          devices,
          disabled: includeDisabled ? !isSupported : undefined,
          label: 'ROCm',
          value: 'rocm',
        });
      }
    }

    if (accelerationSupport.vulkan) {
      const devices = ignoreIGPUs
        ? hardwareCapabilities.vulkan.devices.filter((d) => !d.isIntegrated)
        : hardwareCapabilities.vulkan.devices;
      const isSupported = devices.length > 0;
      if (isSupported || includeDisabled) {
        accelerations.push({
          devices,
          disabled: includeDisabled ? !isSupported : undefined,
          label: 'Vulkan',
          value: 'vulkan',
        });
      }
    }

    accelerations.push({
      devices: cpuCapabilities?.devices.map((device) => device.name) ?? [],
      disabled: false,
      label: CPU_LABEL,
      value: 'cpu',
    });

    if (includeDisabled) {
      accelerations.sort((a, b) => {
        if (a.disabled === b.disabled) {
          return 0;
        }
        return a.disabled ? 1 : -1;
      });
    }

    availableAccelerationsCache.set(cacheKey, accelerations);
    return accelerations;
  }, 'Failed to get available accelerations');

  return result ?? [{ label: CPU_LABEL, value: 'cpu' }];
}
