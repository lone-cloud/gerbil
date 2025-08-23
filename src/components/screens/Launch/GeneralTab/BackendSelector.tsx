import { Text, Group, Select, Checkbox, TextInput } from '@mantine/core';
import { useState, useEffect, useRef } from 'react';
import { InfoTooltip } from '@/components/InfoTooltip';
import { BackendSelectItem } from '@/components/screens/Launch/GeneralTab/BackendSelectItem';
import { useLaunchConfig } from '@/hooks/useLaunchConfig';

interface BackendSelectorProps {
  onBackendsReady?: () => void;
}

export const BackendSelector = ({ onBackendsReady }: BackendSelectorProps) => {
  const {
    backend,
    gpuDevice,
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
  const hasInitialized = useRef(false);

  useEffect(() => {
    const loadBackends = async () => {
      try {
        const [cpuCapabilitiesResult, backends] = await Promise.all([
          window.electronAPI.kobold.detectCPU(),
          window.electronAPI.kobold.getAvailableBackends(),
        ]);

        const cpuBackend = backends.find((b) => b.value === 'cpu');
        if (cpuBackend) {
          cpuBackend.devices = cpuCapabilitiesResult.devices;
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

    const cleanup = window.electronAPI.kobold.onVersionsUpdated(() => {
      hasInitialized.current = false;
      loadBackends();
    });

    return cleanup;
  }, [onBackendsReady]);

  return (
    <div>
      <Group justify="space-between" align="flex-start" mb="xs">
        <div style={{ flex: 1, marginRight: '2rem' }}>
          <Group gap="xs" align="center" mb="xs">
            <Text size="sm" fw={500}>
              Backend
            </Text>
            <InfoTooltip label="Select a backend to use. CUDA runs on NVIDIA GPUs, and is much faster. ROCm is the AMD equivalent. Vulkan and CLBlast work on all GPUs." />
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
            <InfoTooltip label="The number of layers to offload to your GPU's VRAM. Ideally the entire LLM should fit inside the VRAM for optimal performance." />
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
              disabled={autoGpuLayers || backend === 'cpu'}
            />
            <Group gap="xs" align="center">
              <Checkbox
                label="Auto"
                checked={autoGpuLayers}
                onChange={(event) =>
                  handleAutoGpuLayersChange(event.currentTarget.checked)
                }
                size="sm"
                disabled={backend === 'cpu'}
              />
              <InfoTooltip label="Automatically try to allocate the GPU layers based on available VRAM." />
            </Group>
          </Group>
        </div>
      </Group>
    </div>
  );
};
