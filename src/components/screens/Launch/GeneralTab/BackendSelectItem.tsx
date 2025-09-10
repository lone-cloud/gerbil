import { Text, Group, Badge, Box } from '@mantine/core';
import type { BackendOption } from '@/types';

type BackendSelectItemProps = Omit<BackendOption, 'value'>;

export const BackendSelectItem = ({
  label,
  devices,
  disabled = false,
}: BackendSelectItemProps) => (
  <Group justify="space-between" wrap="nowrap">
    <Box w={!disabled ? '3rem' : 'auto'}>
      <Text size="sm" truncate>
        {label}
        {disabled && (
          <Text component="span" size="xs" ml="xs">
            (Compatible devices not found)
          </Text>
        )}
      </Text>
    </Box>
    {devices && devices.length > 0 && (
      <Group gap={4}>
        {devices.slice(0, 2).map((device, index) => (
          <Badge key={index} size="md" variant="light" color="blue">
            {device.length > 25 ? `${device.slice(0, 25)}...` : device}
          </Badge>
        ))}
        {devices.length > 2 && (
          <Badge size="md" variant="light" color="gray">
            +{devices.length - 2}
          </Badge>
        )}
      </Group>
    )}
  </Group>
);
