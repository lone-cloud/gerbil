import { useCallback, useEffect, useMemo, useState } from 'react';
import type { AccelerationOption, AccelerationSupport } from '@/types';
import type { CPUCapabilities, GPUDevice } from '@/types/hardware';

export interface Warning {
  type: 'warning' | 'info';
  message: string;
}

interface UseWarningsProps {
  model: string;
  sdmodel: string;
  acceleration?: string;
  configLoaded?: boolean;
}

const checkModelWarnings = (model: string, sdmodel: string, configLoaded: boolean) => {
  const hasTextModel = model?.trim() !== '';
  const hasImageModel = sdmodel.trim() !== '';
  const showModelPriorityWarning = hasTextModel && hasImageModel;
  const showNoModelWarning = !hasTextModel && !hasImageModel && configLoaded;

  const warnings: Warning[] = [];

  if (showModelPriorityWarning) {
    warnings.push({
      type: 'info',
      message:
        'Both text and image generation models are selected. This may load both models into VRAM simultaneously, which requires significant memory (typically 16GB+ VRAM recommended). Ensure your system has sufficient VRAM to avoid crashes or poor performance.',
    });
  }

  if (showNoModelWarning) {
    warnings.push({
      type: 'info',
      message: 'Select a model in the General or Image Generation tab to enable launch.',
    });
  }

  return warnings;
};

interface GpuCapabilities {
  cuda: { devices: readonly string[] };
  rocm: { devices: readonly GPUDevice[] };
  vulkan: { devices: readonly GPUDevice[] };
}

interface GpuInfo {
  hasNVIDIA: boolean;
  hasAMD: boolean;
}

const checkGpuWarnings = async (
  accelerationSupport: AccelerationSupport,
  gpuCapabilities: GpuCapabilities,
  gpuInfo: GpuInfo
) => {
  const warnings: Warning[] = [];

  if (accelerationSupport.cuda && gpuCapabilities.cuda.devices.length === 0 && gpuInfo.hasNVIDIA) {
    warnings.push({
      type: 'warning',
      message:
        'Your binary supports CUDA and you have an NVIDIA GPU, but CUDA runtime is not detected on your system.',
    });
  }

  if (accelerationSupport.rocm && gpuCapabilities.rocm.devices.length === 0 && gpuInfo.hasAMD) {
    const platform = await window.electronAPI.kobold.getPlatform();
    const baseMessage =
      'Your binary supports ROCm and you have an AMD GPU, but ROCm runtime is not detected on your system.';

    let message = baseMessage;
    if (platform === 'win32') {
      message +=
        ' On Windows, make sure ROCm is installed and its bin directory is added to your PATH so that hipInfo.exe can be found.';
    }

    warnings.push({
      type: 'info',
      message,
    });
  }

  return warnings;
};

const checkVramWarnings = async (acceleration: string): Promise<Warning[]> => {
  const warnings: Warning[] = [];
  const isGpuAcceleration = ['cuda', 'rocm', 'vulkan'].includes(acceleration);

  if (isGpuAcceleration) {
    const gpuMemoryInfo = await window.electronAPI.kobold.detectGPUMemory();

    if (gpuMemoryInfo) {
      const lowVramThreshold = 8;
      const validGpus = gpuMemoryInfo.filter(
        (gpu) => gpu.totalMemoryGB !== null && gpu.totalMemoryGB !== ''
      );
      const lowVramGpus = validGpus.filter(
        (gpu) => parseFloat(gpu.totalMemoryGB ?? '0') < lowVramThreshold
      );

      if (validGpus.length > 0 && lowVramGpus.length === validGpus.length) {
        const memoryDetails = lowVramGpus
          .map((gpu) => `${parseFloat(gpu.totalMemoryGB ?? '0').toFixed(1)}GB`)
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

const checkCpuWarnings = (acceleration: string, availableAccelerations: AccelerationOption[]) => {
  const warnings: Warning[] = [];

  if (acceleration !== 'cpu') {
    return warnings;
  }

  if (availableAccelerations.length > 0 && availableAccelerations.some((a) => a.value === 'cpu')) {
    warnings.push({
      type: 'info',
      message:
        "LLMs run significantly faster on GPU-accelerated systems. Consider using NVIDIA's CUDA, AMD's ROCm or Vulkan backends for optimal performance.",
    });
  }

  return warnings;
};

const checkBackendWarnings = async (params?: {
  acceleration: string;
  cpuCapabilities: CPUCapabilities | null;
  availableAccelerations: AccelerationOption[];
}) => {
  const warnings: Warning[] = [];

  const [accelerationSupport, gpuCapabilities, gpuInfo] = await Promise.all([
    window.electronAPI.kobold.detectAccelerationSupport(),
    window.electronAPI.kobold.detectGPUCapabilities(),
    window.electronAPI.kobold.detectGPU(),
  ]);

  if (!accelerationSupport) {
    return warnings;
  }

  const gpuWarnings = await checkGpuWarnings(accelerationSupport, gpuCapabilities, gpuInfo);
  warnings.push(...gpuWarnings);

  if (params) {
    const { acceleration, cpuCapabilities, availableAccelerations } = params;

    const vramWarnings = await checkVramWarnings(acceleration);
    warnings.push(...vramWarnings);

    if (cpuCapabilities) {
      const cpuWarnings = checkCpuWarnings(acceleration, availableAccelerations);
      warnings.push(...cpuWarnings);
    }
  }

  return warnings;
};

export const useWarnings = ({
  model,
  sdmodel,
  acceleration,
  configLoaded = false,
}: UseWarningsProps) => {
  const [backendWarnings, setBackendWarnings] = useState<Warning[]>([]);

  const modelWarnings = useMemo(
    () => checkModelWarnings(model, sdmodel, configLoaded),
    [model, sdmodel, configLoaded]
  );

  const updateBackendWarnings = useCallback(async () => {
    if (!acceleration) {
      setBackendWarnings([]);
      return;
    }

    const [cpuCapabilitiesResult, availableAccelerations] = await Promise.all([
      window.electronAPI.kobold.detectCPU(),
      window.electronAPI.kobold.getAvailableAccelerations(),
    ]);

    const result = await checkBackendWarnings({
      acceleration,
      cpuCapabilities: cpuCapabilitiesResult,
      availableAccelerations,
    });

    setBackendWarnings(result);
  }, [acceleration]);

  useEffect(() => {
    void updateBackendWarnings();
  }, [updateBackendWarnings]);

  const allWarnings = useMemo(
    () => [...modelWarnings, ...backendWarnings],
    [modelWarnings, backendWarnings]
  );

  return {
    warnings: allWarnings,
  };
};
