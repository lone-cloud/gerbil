import { platform } from 'node:process';
import { safeExecute } from '@/utils/node/logging';
import { detectGPU } from './hardware';

export interface PlatformGPUInfo {
  hasAMD: boolean;
  hasNVIDIA: boolean;
  isWindows: boolean;
  shouldForceCPU: boolean;
}

export async function getPlatformGPUInfo(): Promise<PlatformGPUInfo> {
  const result = await safeExecute(async () => {
    const gpuInfo = await detectGPU();
    const { hasAMD, hasNVIDIA } = gpuInfo;
    const isWindows = platform === 'win32';
    const shouldForceCPU = (hasAMD && isWindows) || (!hasAMD && !hasNVIDIA);

    return {
      hasAMD,
      hasNVIDIA,
      isWindows,
      shouldForceCPU,
    };
  }, 'Failed to detect platform GPU information');

  return (
    result || {
      hasAMD: false,
      hasNVIDIA: false,
      isWindows: platform === 'win32',
      shouldForceCPU: true,
    }
  );
}
