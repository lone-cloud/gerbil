import { Text, Group, Checkbox, TextInput } from '@mantine/core';
import { useState, useEffect, useRef } from 'react';
import { InfoTooltip } from '@/components/InfoTooltip';
import { AccelerationSelectItem } from '@/components/screens/Launch/GeneralTab/AccelerationSelectItem';
import { GpuDeviceSelector } from '@/components/screens/Launch/GeneralTab/GpuDeviceSelector';
import { useLaunchConfig } from '@/hooks/useLaunchConfig';
import type { AccelerationOption } from '@/types';
import { Select } from '@/components/Select';

export const AccelerationSelector = () => {
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

  const [availableAccelerations, setAvailableAccelerations] = useState<
    AccelerationOption[]
  >([]);
  const [isLoadingAccelerations, setIsLoadingAccelerations] = useState(false);
  const [isCalculatingLayers, setIsCalculatingLayers] = useState(false);
  const [isMac, setIsMac] = useState(false);
  const hasInitialized = useRef(false);

  useEffect(() => {
    const loadAccelerations = async () => {
      setIsLoadingAccelerations(true);

      const [accelerations, platform] = await Promise.all([
        window.electronAPI.kobold.getAvailableAccelerations(true),
        window.electronAPI.kobold.getPlatform(),
      ]);

      setAvailableAccelerations(accelerations || []);
      setIsMac(platform === 'darwin');
      setIsLoadingAccelerations(false);
      hasInitialized.current = true;
    };

    if (!hasInitialized.current) {
      loadAccelerations();
    }

    const cleanup = window.electronAPI.kobold.onVersionsUpdated(() => {
      hasInitialized.current = false;
      loadAccelerations();
    });

    return cleanup;
  }, []);

  useEffect(() => {
    if (availableAccelerations.length > 0 && backend) {
      const isAccelerationAvailable = availableAccelerations.some(
        (a) => a.value === backend && !a.disabled
      );

      if (!isAccelerationAvailable) {
        const fallbackAcceleration = availableAccelerations.find(
          (a) => !a.disabled
        );
        if (fallbackAcceleration) {
          handleBackendChange(fallbackAcceleration.value);
        }
      }
    }
  }, [availableAccelerations, backend, handleBackendChange]);

  useEffect(() => {
    const calculateLayers = async () => {
      const isCpuOnly = backend === 'cpu' && !isMac;
      if (
        !autoGpuLayers ||
        !model ||
        !contextSize ||
        isCpuOnly ||
        isLoadingAccelerations
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
    isLoadingAccelerations,
    isMac,
    handleGpuLayersChange,
  ]);

  return (
    <div>
      <Group justify="space-between" align="flex-start" mb="xs">
        <div style={{ flex: 1, marginRight: '1rem' }}>
          <Group gap="xs" align="center" mb="xs">
            <Text size="sm" fw={500}>
              Acceleration
            </Text>
            <InfoTooltip label="Select an acceleration mode to run LLMs. CUDA runs on NVIDIA GPUs and is much faster. ROCm is the AMD equivalent. Vulkan and CLBlast work on all GPUs." />
          </Group>
          <Select
            placeholder={
              isLoadingAccelerations
                ? 'Loading accelerations...'
                : 'Select acceleration'
            }
            value={
              availableAccelerations.some(
                (a) => a.value === backend && !a.disabled
              )
                ? backend
                : null
            }
            onChange={(value) => {
              if (value) {
                handleBackendChange(value);
              }
            }}
            data={availableAccelerations.map((a) => ({
              value: a.value,
              label: a.label,
              disabled: a.disabled,
            }))}
            disabled={
              isLoadingAccelerations || availableAccelerations.length === 0
            }
            renderOption={({ option }) => {
              const accelerationData = availableAccelerations.find(
                (a) => a.value === option.value
              );

              return (
                <AccelerationSelectItem
                  label={accelerationData?.label || option.label.split(' (')[0]}
                  devices={accelerationData?.devices}
                  disabled={accelerationData?.disabled}
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
              disabled={autoGpuLayers || (backend === 'cpu' && !isMac)}
            />
            <Group gap="xs" align="center">
              <Checkbox
                label="Auto"
                checked={autoGpuLayers}
                onChange={(event) =>
                  handleAutoGpuLayersChange(event.currentTarget.checked)
                }
                size="sm"
                disabled={backend === 'cpu' && !isMac}
              />
              <InfoTooltip label="Automatically calculate optimal GPU layers based on available VRAM. The calculation accounts for model size, context size and flash attention." />
            </Group>
          </Group>
        </div>
      </Group>

      <GpuDeviceSelector availableAccelerations={availableAccelerations} />
    </div>
  );
};
