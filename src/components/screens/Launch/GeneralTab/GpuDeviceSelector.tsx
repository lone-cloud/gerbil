import { Text, Group, Select, TextInput } from '@mantine/core';
import { InfoTooltip } from '@/components/InfoTooltip';
import { useLaunchConfig } from '@/hooks/useLaunchConfig';

interface GpuDeviceSelectorProps {
  availableBackends: Array<{
    value: string;
    label: string;
    devices?: string[];
  }>;
}

export const GpuDeviceSelector = ({
  availableBackends,
}: GpuDeviceSelectorProps) => {
  const {
    backend,
    gpuDeviceSelection,
    tensorSplit,
    handleGpuDeviceSelectionChange,
    handleTensorSplitChange,
  } = useLaunchConfig();

  const selectedBackend = availableBackends.find((b) => b.value === backend);
  const isGpuBackend =
    backend === 'cuda' ||
    backend === 'rocm' ||
    backend === 'vulkan' ||
    backend === 'clblast';
  const hasMultipleDevices =
    selectedBackend?.devices && selectedBackend.devices.length > 1;
  const showTensorSplit =
    (backend === 'cuda' || backend === 'rocm' || backend === 'vulkan') &&
    hasMultipleDevices &&
    gpuDeviceSelection === 'all';

  if (!isGpuBackend || !hasMultipleDevices) {
    return null;
  }

  const deviceOptions =
    backend === 'clblast'
      ? selectedBackend.devices!.map((device, index) => ({
          value: index.toString(),
          label: `GPU ${index}: ${device}`,
        }))
      : [
          { value: 'all', label: 'All GPUs' },
          ...selectedBackend.devices!.map((device, index) => ({
            value: index.toString(),
            label: `GPU ${index}: ${device}`,
          })),
        ];

  return (
    <div>
      <Group align="flex-start" gap="md">
        <div style={{ flex: 1, marginRight: '1rem' }}>
          <Group gap="xs" align="center" mb="xs">
            <Text size="sm" fw={500}>
              GPU Device
            </Text>
            <InfoTooltip label="Select which GPU device(s) to use. Choose 'All GPUs' to use multiple devices with tensor splitting." />
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
