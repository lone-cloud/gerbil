import { Text, Group, Select, Checkbox, TextInput } from '@mantine/core';
import { useState, useEffect, useRef } from 'react';
import { InfoTooltip } from '@/components/InfoTooltip';
import { BackendSelectItem } from '@/components/screens/Launch/GeneralTab/BackendSelectItem';

interface BackendSelectorProps {
  backend: string;
  onBackendChange: (backend: string) => void;
  gpuDevice?: number;
  onGpuDeviceChange?: (device: number) => void;
  noavx2?: boolean;
  failsafe?: boolean;
  onWarningsChange?: (
    warnings: Array<{ type: 'warning' | 'info'; message: string }>
  ) => void;
  onBackendsReady?: () => void;
  gpuLayers?: number;
  autoGpuLayers?: boolean;
  onGpuLayersChange?: (layers: number) => void;
  onAutoGpuLayersChange?: (auto: boolean) => void;
}

export const BackendSelector = ({
  backend,
  onBackendChange,
  gpuDevice = 0,
  onGpuDeviceChange,
  noavx2 = false,
  failsafe = false,
  onWarningsChange,
  onBackendsReady,
  gpuLayers = 0,
  autoGpuLayers = false,
  onGpuLayersChange,
  onAutoGpuLayersChange,
}: BackendSelectorProps) => {
  const [availableBackends, setAvailableBackends] = useState<
    Array<{ value: string; label: string; devices?: string[] }>
  >([]);
  const [cpuCapabilities, setCpuCapabilities] = useState<{
    avx: boolean;
    avx2: boolean;
  } | null>(null);
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (hasInitialized.current) return;

    let timeoutId: number;

    const loadBackends = async () => {
      try {
        const [currentBinaryInfo, cpuCapabilitiesResult, gpuCapabilities] =
          await Promise.all([
            window.electronAPI.kobold.getCurrentBinaryInfo(),
            window.electronAPI.kobold.detectCPU(),
            window.electronAPI.kobold.detectGPUCapabilities(),
          ]);

        setCpuCapabilities({
          avx: cpuCapabilitiesResult.avx,
          avx2: cpuCapabilitiesResult.avx2,
        });

        let backends: Array<{
          value: string;
          label: string;
          devices?: string[];
        }> = [];

        if (currentBinaryInfo?.path) {
          backends = await window.electronAPI.kobold.getAvailableBackends(
            currentBinaryInfo.path,
            gpuCapabilities
          );

          const cpuBackend = backends.find((b) => b.value === 'cpu');
          if (cpuBackend) {
            cpuBackend.devices = cpuCapabilitiesResult.devices;
          }
        }

        setAvailableBackends(backends);
        hasInitialized.current = true;

        if (backends.length > 0 && !backend) {
          timeoutId = window.setTimeout(() => {
            onBackendChange(backends[0].value);
          }, 10);
        }

        if (onBackendsReady) {
          window.setTimeout(() => {
            onBackendsReady();
          }, 100);
        }
      } catch (error) {
        window.electronAPI.logs.logError(
          'Failed to detect available backends:',
          error as Error
        );
        setAvailableBackends([]);

        if (onBackendsReady) {
          onBackendsReady();
        }
      }
    };

    loadBackends();

    return () => {
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [backend, onBackendChange, onBackendsReady]);

  useEffect(() => {
    if (!onWarningsChange) return;

    if (backend !== 'cpu' || !cpuCapabilities) {
      onWarningsChange([]);
      return;
    }

    const warnings: Array<{ type: 'warning' | 'info'; message: string }> = [];

    if (!cpuCapabilities.avx2 && !noavx2) {
      warnings.push({
        type: 'warning',
        message:
          'Your CPU does not support AVX2. Enable the "Disable AVX2" option to avoid crashes.',
      });
    }

    if (!cpuCapabilities.avx && !cpuCapabilities.avx2 && !failsafe) {
      warnings.push({
        type: 'warning',
        message:
          'Your CPU does not support AVX or AVX2. Enable the "Failsafe" option to avoid crashes.',
      });
    }

    if (
      availableBackends.length > 0 &&
      availableBackends.some((b) => b.value === 'cpu')
    ) {
      warnings.push({
        type: 'info',
        message:
          "Performance Note: LLMs run significantly faster on GPU-accelerated systems. Consider using NVIDIA's CUDA or AMD's ROCm backends for optimal performance.",
      });
    }

    onWarningsChange(warnings);
  }, [
    backend,
    cpuCapabilities,
    noavx2,
    failsafe,
    availableBackends,
    onWarningsChange,
  ]);

  return (
    <div>
      <Group justify="space-between" align="flex-start" mb="xs">
        <div style={{ flex: 1, marginRight: '2rem' }}>
          <Group gap="xs" align="center" mb="xs">
            <Text size="sm" fw={500}>
              Backend
            </Text>
            <InfoTooltip label="Select a backend to use. CUDA runs on NVIDIA GPUs, and is much faster. ROCm is the AMD equivalent. Vulkan and CLBlast works on all GPUs but are somewhat slower." />
          </Group>
          <Select
            placeholder="Select backend"
            value={backend}
            onChange={(value) => {
              if (value) {
                onBackendChange(value);
              }
            }}
            data={availableBackends.map((b) => ({
              value: b.value,
              label: b.label,
            }))}
            disabled={availableBackends.length === 0}
            comboboxProps={{
              middlewares: {
                flip: false,
              },
            }}
            renderOption={({ option }) => {
              const backendData = availableBackends.find(
                (b) => b.value === option.value
              );
              return (
                <BackendSelectItem
                  label={backendData?.label || option.label.split(' (')[0]}
                  devices={backendData?.devices}
                />
              );
            }}
          />
          {(() => {
            const selectedBackend = availableBackends.find(
              (b) => b.value === backend
            );
            const isGpuBackend = backend === 'cuda' || backend === 'rocm';
            const hasMultipleDevices =
              selectedBackend?.devices && selectedBackend.devices.length > 1;

            return (
              isGpuBackend &&
              onGpuDeviceChange &&
              hasMultipleDevices && (
                <Select
                  label="GPU Device"
                  placeholder="Select GPU device"
                  value={gpuDevice.toString()}
                  onChange={(value) =>
                    value && onGpuDeviceChange(parseInt(value, 10))
                  }
                  data={selectedBackend.devices!.map((device, index) => ({
                    value: index.toString(),
                    label: `GPU ${index}: ${device}`,
                  }))}
                  mt="xs"
                />
              )
            );
          })()}
        </div>

        {onGpuLayersChange && onAutoGpuLayersChange && (
          <div style={{ flex: 1 }}>
            <Group gap="xs" align="center" mb="xs">
              <Text size="sm" fw={500}>
                GPU Layers
              </Text>
              <InfoTooltip label="The number of layer's to offload to your GPU's VRAM. Ideally the entire LLM should fit inside the VRAM for optimal performance." />
            </Group>
            <Group gap="lg" align="center">
              <TextInput
                value={gpuLayers.toString()}
                onChange={(event) =>
                  onGpuLayersChange(Number(event.target.value) || 0)
                }
                type="number"
                min={0}
                max={100}
                step={1}
                size="sm"
                w={80}
                disabled={autoGpuLayers}
              />
              <Group gap="xs" align="center">
                <Checkbox
                  label="Auto"
                  checked={autoGpuLayers}
                  onChange={(event) =>
                    onAutoGpuLayersChange(event.currentTarget.checked)
                  }
                  size="sm"
                />
                <InfoTooltip label="Automatically try to allocate the GPU layers based on available VRAM." />
              </Group>
            </Group>
          </div>
        )}
      </Group>
    </div>
  );
};
