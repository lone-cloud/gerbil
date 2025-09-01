import { useEffect, useState, useCallback, useMemo } from 'react';
import { safeExecute } from '@/utils/logger';
import type { BackendOption } from '@/types';

export interface Warning {
  type: 'warning' | 'info';
  message: string;
}

interface UseWarningsProps {
  model: string;
  sdmodel: string;
  backend?: string;
  noavx2?: boolean;
  failsafe?: boolean;
  configLoaded?: boolean;
}

const checkModelWarnings = (
  model: string,
  sdmodel: string,
  configLoaded: boolean
): Warning[] => {
  const hasTextModel = model?.trim() !== '';
  const hasImageModel = sdmodel.trim() !== '';
  const showModelPriorityWarning = hasTextModel && hasImageModel;
  const showNoModelWarning = !hasTextModel && !hasImageModel && configLoaded;

  const warnings: Warning[] = [];

  if (showModelPriorityWarning) {
    warnings.push({
      type: 'warning',
      message:
        'Both text and image generation models are selected. The image generation model will take priority and be used for launch.',
    });
  }

  if (showNoModelWarning) {
    warnings.push({
      type: 'info',
      message:
        'Select a model in the General or Image Generation tab to enable launch.',
    });
  }

  return warnings;
};

interface BackendSupport {
  cuda: boolean;
  rocm: boolean;
}

interface GpuCapabilities {
  cuda: { supported: boolean };
  rocm: { supported: boolean };
}

interface GpuInfo {
  hasNVIDIA: boolean;
  hasAMD: boolean;
}

const checkGpuWarnings = async (
  backendSupport: BackendSupport,
  gpuCapabilities: GpuCapabilities,
  gpuInfo: GpuInfo
): Promise<Warning[]> => {
  const warnings: Warning[] = [];

  if (
    backendSupport.cuda &&
    !gpuCapabilities.cuda.supported &&
    gpuInfo.hasNVIDIA
  ) {
    warnings.push({
      type: 'warning',
      message:
        'Your KoboldCpp binary supports CUDA and you have an NVIDIA GPU, but CUDA runtime is not detected on your system.',
    });
  }

  if (
    backendSupport.rocm &&
    !gpuCapabilities.rocm.supported &&
    gpuInfo.hasAMD
  ) {
    warnings.push({
      type: 'warning',
      message:
        'Your KoboldCpp binary supports ROCm and you have an AMD GPU, but ROCm runtime is not detected on your system.',
    });
  }

  return warnings;
};

const checkVramWarnings = async (backend: string): Promise<Warning[]> => {
  const warnings: Warning[] = [];
  const isGpuBackend = ['cuda', 'rocm', 'vulkan', 'clblast'].includes(backend);

  if (isGpuBackend) {
    const gpuMemoryInfo = await safeExecute(
      () => window.electronAPI.kobold.detectGPUMemory(),
      'Failed to detect GPU memory:'
    );

    if (gpuMemoryInfo) {
      const lowVramGpus = gpuMemoryInfo.filter(
        (gpu) =>
          typeof gpu.totalMemoryMB === 'number' && gpu.totalMemoryMB < 8192
      );

      if (lowVramGpus.length > 0) {
        warnings.push({
          type: 'warning',
          message: `Low VRAM detected (${lowVramGpus
            .map(
              (gpu) =>
                `${gpu.deviceName}: ${(gpu.totalMemoryMB! / 1024).toFixed(1)}GB`
            )
            .join(
              ', '
            )}). Consider using smaller models, reducing GPU layers, or enabling the "Low VRAM" option on the Advanced tab.`,
        });
      }
    }
  }

  return warnings;
};

const checkCpuWarnings = (
  backend: string,
  cpuCapabilities: { avx: boolean; avx2: boolean },
  noavx2: boolean,
  failsafe: boolean,
  availableBackends: BackendOption[]
): Warning[] => {
  const warnings: Warning[] = [];

  if (backend !== 'cpu') {
    return warnings;
  }

  if (!cpuCapabilities.avx2 && !noavx2) {
    warnings.push({
      type: 'warning',
      message:
        'Your CPU does not support AVX2. Enable the "Disable AVX2" option on the Advanced tab to avoid crashes.',
    });
  }

  if (!cpuCapabilities.avx && !cpuCapabilities.avx2 && !failsafe) {
    warnings.push({
      type: 'warning',
      message:
        'Your CPU does not support AVX or AVX2. Enable the "Failsafe" option on the Advanced tab to avoid crashes.',
    });
  }

  if (
    availableBackends.length > 0 &&
    availableBackends.some((b) => b.value === 'cpu')
  ) {
    warnings.push({
      type: 'info',
      message:
        "LLMs run significantly faster on GPU-accelerated systems. Consider using NVIDIA's CUDA, AMD's ROCm or Vulkan backends for optimal performance.",
    });
  }

  return warnings;
};

const checkBackendWarnings = async (params?: {
  backend: string;
  cpuCapabilities: {
    avx: boolean;
    avx2: boolean;
  } | null;
  noavx2: boolean;
  failsafe: boolean;
  availableBackends: BackendOption[];
}): Promise<Warning[]> => {
  const warnings: Warning[] = [];

  const result = await safeExecute(async () => {
    const [backendSupport, gpuCapabilities, gpuInfo] = await Promise.all([
      window.electronAPI.kobold.detectBackendSupport(),
      window.electronAPI.kobold.detectGPUCapabilities(),
      window.electronAPI.kobold.detectGPU(),
    ]);

    if (!backendSupport) {
      return warnings;
    }

    const gpuWarnings = await checkGpuWarnings(
      backendSupport,
      gpuCapabilities,
      gpuInfo
    );
    warnings.push(...gpuWarnings);

    if (params) {
      const { backend, cpuCapabilities, noavx2, failsafe, availableBackends } =
        params;

      const vramWarnings = await checkVramWarnings(backend);
      warnings.push(...vramWarnings);

      if (cpuCapabilities) {
        const cpuWarnings = checkCpuWarnings(
          backend,
          cpuCapabilities,
          noavx2,
          failsafe,
          availableBackends
        );
        warnings.push(...cpuWarnings);
      }
    }

    return warnings;
  }, 'Failed to check backend warnings:');

  return result || warnings;
};

export const useWarnings = ({
  model,
  sdmodel,
  backend,
  noavx2 = false,
  failsafe = false,
  configLoaded = false,
}: UseWarningsProps) => {
  const [backendWarnings, setBackendWarnings] = useState<Warning[]>([]);

  const modelWarnings = useMemo(
    () => checkModelWarnings(model, sdmodel, configLoaded),
    [model, sdmodel, configLoaded]
  );

  const updateBackendWarnings = useCallback(async () => {
    if (!backend) {
      setBackendWarnings([]);
      return;
    }

    const result = await safeExecute(async () => {
      const [cpuCapabilitiesResult, availableBackends] = await Promise.all([
        window.electronAPI.kobold.detectCPU(),
        window.electronAPI.kobold.getAvailableBackends(),
      ]);

      const cpuCapabilities = {
        avx: cpuCapabilitiesResult.avx,
        avx2: cpuCapabilitiesResult.avx2,
      };

      return checkBackendWarnings({
        backend,
        cpuCapabilities,
        noavx2,
        failsafe,
        availableBackends,
      });
    }, 'Failed to check backend warnings:');

    setBackendWarnings(result || []);
  }, [backend, noavx2, failsafe]);

  useEffect(() => {
    updateBackendWarnings();
  }, [updateBackendWarnings]);

  const allWarnings = useMemo(
    () => [...modelWarnings, ...backendWarnings],
    [modelWarnings, backendWarnings]
  );

  return {
    warnings: allWarnings,
  };
};
