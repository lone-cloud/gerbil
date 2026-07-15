import { Badge, Box, Group, Text } from '@mantine/core';

import { usePreferencesStore } from '@/stores/preferences';
import type { AccelerationOption } from '@/types';
import type { GPUDevice } from '@/types/hardware';

type AccelerationSelectItemProps = Omit<AccelerationOption, 'value'>;

const renderDeviceName = (device: string | GPUDevice) => {
  const deviceName = typeof device === 'string' ? device : device.name;
  return deviceName.length > 25 ? `${deviceName.slice(0, 25)}...` : deviceName;
};

export const AccelerationSelectItem = ({
  label,
  devices,
  disabled = false,
}: AccelerationSelectItemProps) => {
  const ignoreIGPUs = usePreferencesStore((s) => s.ignoreIGPUs);

  const shownDevices =
    ignoreIGPUs && devices
      ? devices.filter((d) => typeof d === 'string' || !d.isIntegrated)
      : (devices ?? []);

  return (
    <Group justify="space-between" wrap="nowrap">
      <Box w={!disabled ? '3.5rem' : 'auto'}>
        <Text size="sm" truncate>
          {label}
          {disabled && (
            <Text component="span" size="xs" ml="xs">
              (Compatible devices not found)
            </Text>
          )}
        </Text>
      </Box>
      {shownDevices.length > 0 && (
        <Group gap={4}>
          {shownDevices.slice(0, 2).map((device, index) => (
            <Badge key={index} size="md" variant="light" color="brand">
              {renderDeviceName(device)}
            </Badge>
          ))}
          {shownDevices.length > 2 && (
            <Badge size="md" variant="light" color="gray">
              +{shownDevices.length - 2}
            </Badge>
          )}
        </Group>
      )}
    </Group>
  );
};
