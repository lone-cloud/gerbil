import { Text, Group, Badge, Box } from '@mantine/core';
import type { BackendOption } from '@/types';
import { GPUDevice } from '@/types/hardware';

type BackendSelectItemProps = Omit<BackendOption, 'value'>;

export const BackendSelectItem = ({
  label,
  devices,
  disabled = false,
}: BackendSelectItemProps) => {
  const renderDeviceName = (device: string | GPUDevice) => {
    const deviceName = typeof device === 'string' ? device : device.name;
    return deviceName.length > 25
      ? `${deviceName.slice(0, 25)}...`
      : deviceName;
  };

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
      {devices &&
        devices.length > 0 &&
        (() => {
          const discreteDevices = devices.filter(
            (device) => typeof device === 'string' || !device.isIntegrated
          );
          return (
            discreteDevices.length > 0 && (
              <Group gap={4}>
                {discreteDevices.slice(0, 2).map((device, index) => (
                  <Badge key={index} size="md" variant="light" color="blue">
                    {renderDeviceName(device)}
                  </Badge>
                ))}
                {discreteDevices.length > 2 && (
                  <Badge size="md" variant="light" color="gray">
                    +{discreteDevices.length - 2}
                  </Badge>
                )}
              </Group>
            )
          );
        })()}
    </Group>
  );
};
