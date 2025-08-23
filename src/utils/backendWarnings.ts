export interface BackendWarning {
  type: 'warning' | 'info';
  message: string;
}

interface WarningParams {
  backend: string;
  cpuCapabilities: {
    avx: boolean;
    avx2: boolean;
  } | null;
  noavx2: boolean;
  failsafe: boolean;
  availableBackends: Array<{
    value: string;
    label: string;
    devices?: string[];
  }>;
}

export const checkBackendWarnings = async (
  params?: WarningParams
  // eslint-disable-next-line sonarjs/cognitive-complexity
): Promise<BackendWarning[]> => {
  const warnings: BackendWarning[] = [];

  try {
    const [backendSupport, gpuCapabilities, gpuInfo] = await Promise.all([
      window.electronAPI.kobold.detectBackendSupport(),
      window.electronAPI.kobold.detectGPUCapabilities(),
      window.electronAPI.kobold.detectGPU(),
    ]);

    if (!backendSupport) {
      return warnings;
    }

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

    if (params) {
      const { backend, cpuCapabilities, noavx2, failsafe, availableBackends } =
        params;

      const isGpuBackend = ['cuda', 'rocm', 'vulkan', 'clblast'].includes(
        backend
      );

      if (isGpuBackend) {
        try {
          const gpuMemoryInfo =
            await window.electronAPI.kobold.detectGPUMemory();
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
        } catch (error) {
          window.electronAPI.logs.logError(
            'Failed to detect GPU memory:',
            error as Error
          );
        }
      }

      if (backend === 'cpu' && cpuCapabilities) {
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
      }
    }

    return warnings;
  } catch (error) {
    window.electronAPI.logs.logError(
      'Failed to check backend warnings:',
      error as Error
    );
    return warnings;
  }
};
