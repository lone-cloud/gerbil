import { join, dirname } from 'path';
import { platform } from 'process';
import { pathExists } from '@/utils/node/fs';
import { getCurrentBinaryInfo } from './version';
import { detectGPUCapabilities, detectCPU } from '../hardware';
import { tryExecute, safeExecute } from '@/utils/node/logging';
import type { BackendOption, BackendSupport } from '@/types';

const backendSupportCache = new Map<string, BackendSupport>();
const availableBackendsCache = new Map<string, BackendOption[]>();

async function detectBackendSupportFromPath(koboldBinaryPath: string) {
  if (backendSupportCache.has(koboldBinaryPath)) {
    return backendSupportCache.get(koboldBinaryPath)!;
  }

  const support: BackendSupport = {
    rocm: false,
    vulkan: false,
    clblast: false,
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

    const [rocm, vulkan, clblast, noavx2, failsafe, cuda] = await Promise.all([
      hasKoboldCppLib('koboldcpp_hipblas'),
      hasKoboldCppLib('koboldcpp_vulkan'),
      hasKoboldCppLib('koboldcpp_clblast'),
      hasKoboldCppLib('koboldcpp_noavx2'),
      hasKoboldCppLib('koboldcpp_failsafe'),
      hasKoboldCppLib('koboldcpp_cublas'),
    ]);

    support.rocm = rocm;
    support.vulkan = vulkan;
    support.clblast = clblast;
    support.noavx2 = noavx2;
    support.failsafe = failsafe;
    support.cuda = cuda;
  }, 'Error detecting backend support');

  backendSupportCache.set(koboldBinaryPath, support);
  return support;
}

export const detectBackendSupport = async () =>
  (await safeExecute(async () => {
    const currentBinaryInfo = await getCurrentBinaryInfo();

    if (!currentBinaryInfo?.path) {
      return null;
    }

    return detectBackendSupportFromPath(currentBinaryInfo.path);
  }, 'Error detecting current binary backend support')) || null;

export async function getAvailableBackends(includeDisabled = false) {
  // eslint-disable-next-line sonarjs/cognitive-complexity
  const result = await safeExecute(async () => {
    const [currentBinaryInfo, hardwareCapabilities, cpuCapabilities] =
      await Promise.all([
        getCurrentBinaryInfo(),
        detectGPUCapabilities(),
        includeDisabled ? detectCPU() : Promise.resolve(null),
      ]);

    if (!currentBinaryInfo?.path) {
      return [{ value: 'cpu', label: 'CPU' }];
    }

    const cacheKey = `${currentBinaryInfo.path}:${includeDisabled}`;

    if (availableBackendsCache.has(cacheKey)) {
      return availableBackendsCache.get(cacheKey)!;
    }

    const backendSupport = await detectBackendSupport();

    if (!backendSupport) {
      return [];
    }

    const backends: BackendOption[] = [];

    if (backendSupport.cuda) {
      const isSupported = hardwareCapabilities.cuda.devices.length > 0;
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
      const isSupported = hardwareCapabilities.rocm.devices.length > 0;
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
      const isSupported = hardwareCapabilities.vulkan.devices.length > 0;
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
      const isSupported = hardwareCapabilities.clblast.devices.length > 0;
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

    availableBackendsCache.set(cacheKey, backends);
    return backends;
  }, 'Failed to get available backends');

  return result || [{ value: 'cpu', label: 'CPU' }];
}
