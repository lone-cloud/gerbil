import { Text, Group, Select, Checkbox, TextInput } from '@mantine/core';
import { useState, useEffect, useRef } from 'react';
import { InfoTooltip } from '@/components/InfoTooltip';
import { BackendSelectItem } from '@/components/screens/Launch/GeneralTab/BackendSelectItem';
import { useLaunchConfig } from '@/hooks/useLaunchConfig';

interface BackendSelectorProps {
  onWarningsChange?: (
    warnings: Array<{ type: 'warning' | 'info'; message: string }>
  ) => void;
  onBackendsReady?: () => void;
}

export const BackendSelector = ({
  onWarningsChange,
  onBackendsReady,
}: BackendSelectorProps) => {
  const {
    backend,
    gpuDevice,
    noavx2,
    failsafe,
    gpuLayers,
    autoGpuLayers,
    handleBackendChange,
    handleGpuDeviceChange,
    handleGpuLayersChange,
    handleAutoGpuLayersChange,
  } = useLaunchConfig();

  const [availableBackends, setAvailableBackends] = useState<
    Array<{ value: string; label: string; devices?: string[] }>
  >([]);
  const [cpuCapabilities, setCpuCapabilities] = useState<{
    avx: boolean;
    avx2: boolean;
  } | null>(null);
  const hasInitialized = useRef(false);

  useEffect(() => {
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

        if (onBackendsReady) {
          onBackendsReady();
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

    if (!hasInitialized.current) {
      loadBackends();
    }
  }, [onBackendsReady]);

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
                handleBackendChange(value);
              }
            }}
            data={availableBackends.map((b) => ({
              value: b.value,
              label: b.label,
            }))}
            disabled={availableBackends.length === 0}
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
              hasMultipleDevices && (
                <Select
                  label="GPU Device"
                  placeholder="Select GPU device"
                  value={gpuDevice.toString()}
                  onChange={(value) =>
                    value && handleGpuDeviceChange(parseInt(value, 10))
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
                handleGpuLayersChange(Number(event.target.value) || 0)
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
                  handleAutoGpuLayersChange(event.currentTarget.checked)
                }
                size="sm"
              />
              <InfoTooltip label="Automatically try to allocate the GPU layers based on available VRAM." />
            </Group>
          </Group>
        </div>
      </Group>
    </div>
  );
};
