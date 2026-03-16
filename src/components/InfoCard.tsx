import { ActionIcon, Card, Group, Stack, Text, Tooltip, rem } from '@mantine/core';
import { Copy } from 'lucide-react';

import { safeExecute } from '@/utils/logger';

export interface InfoItem {
  label: string;
  value: string;
}

interface InfoCardProps {
  title: string;
  items: InfoItem[];
  loading?: boolean;
}

export const InfoCard = ({ title, items, loading = false }: InfoCardProps) => {
  const copyInfo = async () => {
    const info = items.map((item) => `${item.label}: ${item.value}`).join('\n');

    await safeExecute(
      () => navigator.clipboard.writeText(info),
      `Failed to copy ${title.toLowerCase()}`,
    );
  };

  if (loading) {
    return (
      <Card withBorder radius="md" p="xs">
        <Text size="md" fw={600} mb="sm">
          {title}
        </Text>
        <Text size="sm" c="dimmed">
          Loading...
        </Text>
      </Card>
    );
  }

  return (
    <Card withBorder radius="md" p="xs" style={{ position: 'relative' }}>
      <Tooltip label="Copy">
        <ActionIcon
          variant="subtle"
          size="sm"
          onClick={() => void copyInfo()}
          aria-label={`Copy ${title}`}
          style={{
            position: 'absolute',
            right: 8,
            top: 8,
            zIndex: 1,
          }}
        >
          <Copy style={{ height: rem(14), width: rem(14) }} />
        </ActionIcon>
      </Tooltip>

      <Text size="md" fw={600} mb="sm">
        {title}
      </Text>

      <Stack gap="xs">
        {items.map((item, index) => (
          <Group key={index} gap="md" align="center" wrap="nowrap">
            <Text size="sm" fw={500} c="dimmed" style={{ minWidth: '7.5rem' }}>
              {item.label}:
            </Text>
            <Text
              size="sm"
              ff="monospace"
              style={{
                flex: 1,
                wordBreak: 'break-all',
              }}
            >
              {item.value}
            </Text>
          </Group>
        ))}
      </Stack>
    </Card>
  );
};
