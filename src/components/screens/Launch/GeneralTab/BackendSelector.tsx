import { Text, Group, Checkbox, TextInput } from '@mantine/core';
import { useState, useEffect, useRef } from 'react';
import { InfoTooltip } from '@/components/InfoTooltip';
import { BackendSelectItem } from '@/components/screens/Launch/GeneralTab/BackendSelectItem';
import { GpuDeviceSelector } from '@/components/screens/Launch/GeneralTab/GpuDeviceSelector';
import { useLaunchConfig } from '@/hooks/useLaunchConfig';
import type { BackendOption } from '@/types';
import { Select } from '@/components/Select';

export const BackendSelector = () => {
  const {
    backend,
    gpuLayers,
    autoGpuLayers,
    model,
    contextSize,
    gpuDeviceSelection,
    flashattention,
    handleBackendChange,
    handleGpuLayersChange,
    handleAutoGpuLayersChange,
  } = useLaunchConfig();

  const [availableBackends, setAvailableBackends] = useState<BackendOption[]>(
    []
  );
  const [isLoadingBackends, setIsLoadingBackends] = useState(false);
  const [isCalculatingLayers, setIsCalculatingLayers] = useState(false);
  const hasInitialized = useRef(false);

  useEffect(() => {
    const loadBackends = async () => {
      setIsLoadingBackends(true);

      const backends =
        await window.electronAPI.kobold.getAvailableBackends(true);

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

  useEffect(() => {
    if (availableBackends.length > 0 && backend) {
      const isBackendAvailable = availableBackends.some(
        (b) => b.value === backend && !b.disabled
      );

      if (!isBackendAvailable) {
        const fallbackBackend = availableBackends.find((b) => !b.disabled);
        if (fallbackBackend) {
          handleBackendChange(fallbackBackend.value);
        }
      }
    }
  }, [availableBackends, backend, handleBackendChange]);

  useEffect(() => {
    const calculateLayers = async () => {
      if (
        !autoGpuLayers ||
        !model ||
        !contextSize ||
        backend === 'cpu' ||
        isLoadingBackends
      ) {
        return;
      }

      try {
        setIsCalculatingLayers(true);

        const gpuMemory = await window.electronAPI.kobold.detectGPUMemory();
        if (!gpuMemory || gpuMemory.length === 0) {
          return;
        }

        const selectedDeviceIndices = gpuDeviceSelection
          .split(',')
          .map((d) => parseInt(d.trim(), 10))
          .filter((d) => !isNaN(d));

        const availableVramGB = selectedDeviceIndices.reduce(
          (total, deviceIndex) => {
            const device = gpuMemory[deviceIndex];
            const vramGB = device?.totalMemoryGB
              ? parseFloat(device.totalMemoryGB)
              : 0;
            return total + vramGB;
          },
          0
        );

        if (availableVramGB === 0) {
          return;
        }

        const result = await window.electronAPI.kobold.calculateOptimalLayers(
          model,
          contextSize,
          availableVramGB,
          flashattention
        );

        handleGpuLayersChange(result.recommendedLayers);
      } catch (error) {
        window.electronAPI.logs.logError(
          'Failed to calculate optimal GPU layers',
          error as Error
        );
      } finally {
        setIsCalculatingLayers(false);
      }
    };

    calculateLayers();
  }, [
    autoGpuLayers,
    model,
    contextSize,
    backend,
    gpuDeviceSelection,
    flashattention,
    isLoadingBackends,
    handleGpuLayersChange,
  ]);

  return (
    <div>
      <Group justify="space-between" align="flex-start" mb="xs">
        <div style={{ flex: 1, marginRight: '1rem' }}>
          <Group gap="xs" align="center" mb="xs">
            <Text size="sm" fw={500}>
              Backend
            </Text>
            <InfoTooltip label="Select a backend to use to run LLMs. CUDA runs on NVIDIA GPUs and is much faster. ROCm is the AMD equivalent. Vulkan and CLBlast work on all GPUs." />
          </Group>
          <Select
            placeholder={
              isLoadingBackends ? 'Loading backends...' : 'Select backend'
            }
            value={
              availableBackends.some((b) => b.value === backend && !b.disabled)
                ? backend
                : null
            }
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
            <InfoTooltip label="The number of layers to offload to your GPU's VRAM. When Auto is enabled, this is calculated based on your model size, context size, available VRAM and flash attention settings." />
          </Group>
          <Group gap="lg" align="center">
            <TextInput
              value={autoGpuLayers ? '' : gpuLayers.toString()}
              placeholder={
                autoGpuLayers
                  ? isCalculatingLayers
                    ? 'Calculating...'
                    : gpuLayers.toString()
                  : undefined
              }
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
              <InfoTooltip label="Automatically calculate optimal GPU layers based on available VRAM. The calculation accounts for model size, context size and flash attention." />
            </Group>
          </Group>
        </div>
      </Group>

      <GpuDeviceSelector availableBackends={availableBackends} />
    </div>
  );
};
