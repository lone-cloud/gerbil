import { Group, Text, TextInput } from '@mantine/core';

import { InfoTooltip } from '@/components/InfoTooltip';
import { Select } from '@/components/Select';
import { useLaunchConfigStore } from '@/stores/launchConfig';
import { usePreferencesStore } from '@/stores/preferences';
import type { AccelerationOption } from '@/types';

const GPU_ACCELERATIONS = new Set(['cuda', 'rocm', 'vulkan']);
const TENSOR_SPLIT_ACCELERATIONS = new Set(['cuda', 'rocm', 'vulkan']);

interface GpuDeviceSelectorProps {
  availableAccelerations: AccelerationOption[];
}

export const GpuDeviceSelector = ({ availableAccelerations }: GpuDeviceSelectorProps) => {
  const { acceleration, gpuDeviceSelection, tensorSplit, setGpuDeviceSelection, setTensorSplit } =
    useLaunchConfigStore();
  const ignoreIGPUs = usePreferencesStore((s) => s.ignoreIGPUs);

  const selectedAcceleration = availableAccelerations.find((a) => a.value === acceleration);
  const isGpuAcceleration = GPU_ACCELERATIONS.has(acceleration);

  const getDeviceCount = () => {
    if (!selectedAcceleration?.devices) {
      return 0;
    }
    if (acceleration === 'vulkan' || acceleration === 'rocm') {
      return ignoreIGPUs
        ? selectedAcceleration.devices.filter(
            (device) => typeof device === 'string' || !device.isIntegrated,
          ).length
        : selectedAcceleration.devices.length;
    }
    return selectedAcceleration.devices.length;
  };

  const deviceCount = getDeviceCount();
  const hasMultipleDevices = deviceCount > 1;
  const showTensorSplit =
    TENSOR_SPLIT_ACCELERATIONS.has(acceleration) &&
    hasMultipleDevices &&
    gpuDeviceSelection === 'all';

  if (!isGpuAcceleration || !hasMultipleDevices) {
    return null;
  }

  const deviceOptions = (() => {
    if (!selectedAcceleration?.devices) {
      return [];
    }

    if (acceleration === 'vulkan' || acceleration === 'rocm') {
      const filtered = ignoreIGPUs
        ? selectedAcceleration.devices
            .map((device, index) => {
              if (typeof device === 'object' && device.isIntegrated) return null;
              return { device, index };
            })
            .filter((v): v is NonNullable<typeof v> => v !== null)
        : selectedAcceleration.devices.map((device, index) => ({ device, index }));

      const options = filtered.map(({ device, index }) => ({
        label: `GPU ${index}: ${typeof device === 'string' ? device : device.name}`,
        value: index.toString(),
      }));

      return [{ label: 'All GPUs', value: 'all' }, ...options];
    }

    return [
      { label: 'All GPUs', value: 'all' },
      ...selectedAcceleration.devices.map((device, index) => {
        const deviceName =
          typeof device === 'string'
            ? device
            : typeof device === 'object' && 'name' in device
              ? device.name
              : String(device);
        return {
          label: `GPU ${index}: ${deviceName}`,
          value: index.toString(),
        };
      }),
    ];
  })();

  return (
    <div>
      <Group align="flex-start" gap="md">
        <div style={{ flex: 1, marginRight: 'var(--mantine-spacing-md)' }}>
          <Group gap="xs" align="center" mb="xs">
            <Text size="sm" fw={500}>
              GPU Device
            </Text>
            <InfoTooltip label="Select which GPU device to use. Choose 'All GPUs' to use multiple devices with tensor splitting." />
          </Group>
          <Select
            placeholder="Select GPU device"
            value={gpuDeviceSelection}
            onChange={(value) => {
              if (value) {
                setGpuDeviceSelection(value);
              }
            }}
            data={deviceOptions}
          />
        </div>

        <div style={{ flex: 1 }}>
          {showTensorSplit && (
            <>
              <Group gap="xs" align="center" mb="xs">
                <Text size="sm" fw={500}>
                  Tensor Split
                </Text>
                <InfoTooltip label='When using multiple GPUs this option controls how large tensors should be split across all GPUs. Uses a comma-separated list of non-negative values that assigns the proportion of data that each GPU should get in order. For example, "3,2" will assign 60% of the data to GPU 0 and 40% to GPU 1.' />
              </Group>
              <TextInput
                placeholder="e.g., 3,2 or 1,1,1"
                value={tensorSplit}
                onChange={(event) => setTensorSplit(event.target.value)}
                size="sm"
                aria-label="Tensor split"
              />
            </>
          )}
        </div>
      </Group>
    </div>
  );
};
