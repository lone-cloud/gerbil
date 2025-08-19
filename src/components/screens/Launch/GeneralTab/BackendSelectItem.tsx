import { Text, Group, Badge } from '@mantine/core';
import { forwardRef } from 'react';
import type { ComponentPropsWithoutRef } from 'react';

interface BackendSelectItemProps extends ComponentPropsWithoutRef<'div'> {
  label: string;
  devices?: string[];
}

export const BackendSelectItem = forwardRef<
  HTMLDivElement,
  BackendSelectItemProps
>(({ label, devices, ...others }, ref) => (
  <div ref={ref} {...others}>
    <Group justify="space-between" wrap="nowrap">
      <Text size="sm" truncate>
        {label}
      </Text>
      {devices && devices.length > 0 && (
        <Group gap={4}>
          {devices.slice(0, 2).map((device, index) => (
            <Badge key={index} size="md" variant="light" color="blue">
              {device.length > 18 ? `${device.slice(0, 18)}...` : device}
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
  </div>
));

BackendSelectItem.displayName = 'BackendSelectItem';
