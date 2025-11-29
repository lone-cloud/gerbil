import { Text, Group, TextInput } from '@mantine/core';
import { InfoTooltip } from '@/components/InfoTooltip';
import { useLaunchConfig } from '@/hooks/useLaunchConfig';
import { Select } from '@/components/Select';
import type { AccelerationOption } from '@/types';

interface GpuDeviceSelectorProps {
  availableAccelerations: AccelerationOption[];
}

export const GpuDeviceSelector = ({
  availableAccelerations,
}: GpuDeviceSelectorProps) => {
  const {
    backend,
    gpuDeviceSelection,
    tensorSplit,
    handleGpuDeviceSelectionChange,
    handleTensorSplitChange,
  } = useLaunchConfig();

  const selectedAcceleration = availableAccelerations.find(
    (a) => a.value === backend
  );
  const isGpuAcceleration =
    backend === 'cuda' ||
    backend === 'rocm' ||
    backend === 'vulkan' ||
    backend === 'clblast';

  const getDiscreteDeviceCount = () => {
    if (!selectedAcceleration?.devices) return 0;
    if (backend === 'clblast' || backend === 'vulkan' || backend === 'rocm') {
      return selectedAcceleration.devices.filter(
        (device) => typeof device === 'string' || !device.isIntegrated
      ).length;
    }
    return selectedAcceleration.devices.length;
  };

  const hasMultipleDevices = getDiscreteDeviceCount() > 1;
  const showTensorSplit =
    (backend === 'cuda' || backend === 'rocm' || backend === 'vulkan') &&
    hasMultipleDevices &&
    gpuDeviceSelection === 'all';

  if (!isGpuAcceleration || !hasMultipleDevices) {
    return null;
  }

  const deviceOptions = (() => {
    if (!selectedAcceleration?.devices) return [];

    if (backend === 'clblast') {
      return selectedAcceleration.devices
        .map((device, index) => {
          if (typeof device === 'object' && device.isIntegrated) {
            return null;
          }
          const deviceName = typeof device === 'string' ? device : device.name;
          return {
            value: index.toString(),
            label: `GPU ${index}: ${deviceName}`,
          };
        })
        .filter(
          (option): option is NonNullable<typeof option> => option !== null
        );
    }

    if (backend === 'vulkan' || backend === 'rocm') {
      const discreteDeviceOptions = selectedAcceleration.devices
        .map((device, index) => {
          if (typeof device === 'object' && device.isIntegrated) {
            return null;
          }
          const deviceName = typeof device === 'string' ? device : device.name;
          return {
            value: index.toString(),
            label: `GPU ${index}: ${deviceName}`,
          };
        })
        .filter(
          (option): option is NonNullable<typeof option> => option !== null
        );

      return [{ value: 'all', label: 'All GPUs' }, ...discreteDeviceOptions];
    }

    return [
      { value: 'all', label: 'All GPUs' },
      ...selectedAcceleration.devices.map((device, index) => {
        const deviceName =
          typeof device === 'string'
            ? device
            : typeof device === 'object' && 'name' in device
              ? device.name
              : String(device);
        return {
          value: index.toString(),
          label: `GPU ${index}: ${deviceName}`,
        };
      }),
    ];
  })();

  return (
    <div>
      <Group align="flex-start" gap="md">
        <div style={{ flex: 1, marginRight: '1rem' }}>
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
                handleGpuDeviceSelectionChange(value);
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
                onChange={(event) =>
                  handleTensorSplitChange(event.target.value)
                }
                size="sm"
              />
            </>
          )}
        </div>
      </Group>
    </div>
  );
};
