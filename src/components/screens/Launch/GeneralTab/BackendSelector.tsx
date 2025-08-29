import { Text, Group, Select, Checkbox, TextInput } from '@mantine/core';
import { useState, useEffect, useRef } from 'react';
import { InfoTooltip } from '@/components/InfoTooltip';
import { BackendSelectItem } from '@/components/screens/Launch/GeneralTab/BackendSelectItem';
import { GpuDeviceSelector } from '@/components/screens/Launch/GeneralTab/GpuDeviceSelector';
import { useLaunchConfig } from '@/hooks/useLaunchConfig';
import { Logger } from '@/utils/logger';
import type { BackendOption } from '@/types';

export const BackendSelector = () => {
  const {
    backend,
    gpuLayers,
    autoGpuLayers,
    handleBackendChange,
    handleGpuLayersChange,
    handleAutoGpuLayersChange,
  } = useLaunchConfig();

  const [availableBackends, setAvailableBackends] = useState<BackendOption[]>(
    []
  );
  const [isLoadingBackends, setIsLoadingBackends] = useState(false);
  const hasInitialized = useRef(false);

  useEffect(() => {
    const loadBackends = async () => {
      setIsLoadingBackends(true);
      const backends = await Logger.safeExecute(
        () => window.electronAPI.kobold.getAvailableBackends(true),
        'Failed to detect available backends:'
      );
      setAvailableBackends(backends || []);
      setIsLoadingBackends(false);
      hasInitialized.current = true;
    };

    if (!hasInitialized.current) {
      loadBackends();
    }

    const cleanup = window.electronAPI.kobold.onVersionsUpdated(() => {
      hasInitialized.current = false;
      loadBackends();
    });

    return cleanup;
  }, []);

  return (
    <div>
      <Group justify="space-between" align="flex-start" mb="xs">
        <div style={{ flex: 1, marginRight: '1rem' }}>
          <Group gap="xs" align="center" mb="xs">
            <Text size="sm" fw={500}>
              Backend
            </Text>
            <InfoTooltip label="Select a backend to use. CUDA runs on NVIDIA GPUs, and is much faster. ROCm is the AMD equivalent. Vulkan and CLBlast work on all GPUs." />
          </Group>
          <Select
            placeholder={
              isLoadingBackends ? 'Loading backends...' : 'Select backend'
            }
            value={backend}
            onChange={(value) => {
              if (value) {
                handleBackendChange(value);
              }
            }}
            data={availableBackends.map((b) => ({
              value: b.value,
              label: b.label,
              disabled: b.disabled,
            }))}
            disabled={isLoadingBackends || availableBackends.length === 0}
            renderOption={({ option }) => {
              const backendData = availableBackends.find(
                (b) => b.value === option.value
              );
              return (
                <BackendSelectItem
                  label={backendData?.label || option.label.split(' (')[0]}
                  devices={backendData?.devices}
                  disabled={backendData?.disabled}
                />
              );
            }}
          />
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

      <GpuDeviceSelector availableBackends={availableBackends} />
    </div>
  );
};
