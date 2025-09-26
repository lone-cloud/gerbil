import { useEffect, useState, useCallback, useMemo } from 'react';
import type { BackendOption, BackendSupport } from '@/types';

export interface Warning {
  type: 'warning' | 'info';
  message: string;
}

interface UseWarningsProps {
  model: string;
  sdmodel: string;
  backend?: string;
  configLoaded?: boolean;
}

const checkModelWarnings = (
  model: string,
  sdmodel: string,
  configLoaded: boolean
) => {
  const hasTextModel = model?.trim() !== '';
  const hasImageModel = sdmodel.trim() !== '';
  const showModelPriorityWarning = hasTextModel && hasImageModel;
  const showNoModelWarning = !hasTextModel && !hasImageModel && configLoaded;

  const warnings: Warning[] = [];

  if (showModelPriorityWarning) {
    warnings.push({
      type: 'warning',
      message:
        'Both text and image generation models are selected. This may load both models into VRAM simultaneously, which requires significant memory (typically 16GB+ VRAM recommended). Ensure your system has sufficient VRAM to avoid crashes or poor performance.',
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
        'Your binary supports CUDA and you have an NVIDIA GPU, but CUDA runtime is not detected on your system.',
    });
  }

  if (
    backendSupport.rocm &&
    !gpuCapabilities.rocm.supported &&
    gpuInfo.hasAMD
  ) {
    const platform = await window.electronAPI.kobold.getPlatform();
    const baseMessage =
      'Your binary supports ROCm and you have an AMD GPU, but ROCm runtime is not detected on your system.';

    let message = baseMessage;
    if (platform === 'win32') {
      message +=
        ' On Windows, make sure ROCm is installed and its bin directory is added to your PATH so that hipInfo.exe can be found.';
    }

    warnings.push({
      type: 'warning',
      message,
    });
  }

  return warnings;
};

const checkVramWarnings = async (backend: string): Promise<Warning[]> => {
  const warnings: Warning[] = [];
  const isGpuBackend = ['cuda', 'rocm', 'vulkan', 'clblast'].includes(backend);

  if (isGpuBackend) {
    const gpuMemoryInfo = await window.electronAPI.kobold.detectGPUMemory();

    if (gpuMemoryInfo) {
      const lowVramThreshold = 8;
      const validGpus = gpuMemoryInfo.filter(
        (gpu) => gpu.totalMemoryGB !== null && gpu.totalMemoryGB !== ''
      );
      const lowVramGpus = validGpus.filter(
        (gpu) => parseFloat(gpu.totalMemoryGB!) < lowVramThreshold
      );

      if (validGpus.length > 0 && lowVramGpus.length === validGpus.length) {
        const memoryDetails = lowVramGpus
          .map((gpu) => `${parseFloat(gpu.totalMemoryGB!).toFixed(1)}GB`)
          .join(', ');

        warnings.push({
          type: 'warning',
          message: `Low VRAM detected (${memoryDetails}). Consider using smaller models, reducing GPU layers, or enabling the "Low VRAM" option on the Advanced tab.`,
        });
      }
    }
  }

  return warnings;
};

const checkCpuWarnings = (
  backend: string,
  availableBackends: BackendOption[]
) => {
  const warnings: Warning[] = [];

  if (backend !== 'cpu') {
    return warnings;
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
    devices: string[];
  } | null;
  availableBackends: BackendOption[];
}): Promise<Warning[]> => {
  const warnings: Warning[] = [];

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
    const { backend, cpuCapabilities, availableBackends } = params;

    const vramWarnings = await checkVramWarnings(backend);
    warnings.push(...vramWarnings);

    if (cpuCapabilities) {
      const cpuWarnings = checkCpuWarnings(backend, availableBackends);
      warnings.push(...cpuWarnings);
    }
  }

  return warnings;
};

export const useWarnings = ({
  model,
  sdmodel,
  backend,
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

    const [cpuCapabilitiesResult, availableBackends] = await Promise.all([
      window.electronAPI.kobold.detectCPU(),
      window.electronAPI.kobold.getAvailableBackends(),
    ]);

    const result = await checkBackendWarnings({
      backend,
      cpuCapabilities: cpuCapabilitiesResult,
      availableBackends,
    });

    setBackendWarnings(result);
  }, [backend]);

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
