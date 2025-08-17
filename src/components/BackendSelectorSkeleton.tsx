import { Skeleton, Stack, Group } from '@mantine/core';

export const BackendSelectorSkeleton = () => (
  <div style={{ minHeight: '120px' }}>
    <Group gap="xs" align="center" mb="xs">
      <Skeleton height={14} width={60} />
      <Skeleton height={14} width={14} radius="xl" />
    </Group>
    <Skeleton height={36} radius="sm" mb="xs" />
    <Stack gap="xs" mt="xs">
      <Group gap="xs">
        <Skeleton height={12} width={40} />
        <Skeleton height={20} width={80} radius="sm" />
        <Skeleton height={20} width={100} radius="sm" />
      </Group>
    </Stack>
  </div>
);
