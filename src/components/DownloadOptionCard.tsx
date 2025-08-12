import { Card, Stack, Group, Text, Badge, Button, Loader } from '@mantine/core';
import { IconDownload } from '@tabler/icons-react';
import { MouseEvent } from 'react';

interface DownloadOptionCardProps {
  name: string;
  description: string;
  size: string;
  isSelected: boolean;
  isRecommended: boolean;
  isDownloading: boolean;
  onClick: () => void;
  onDownload: (e: MouseEvent<HTMLButtonElement>) => void;
}

export const DownloadOptionCard = ({
  name,
  description,
  size,
  isSelected,
  isRecommended,
  isDownloading,
  onClick,
  onDownload,
}: DownloadOptionCardProps) => (
  <Card
    withBorder
    radius="md"
    style={{
      cursor: 'pointer',
    }}
    bd={isSelected ? '2px solid var(--mantine-color-blue-filled)' : undefined}
    bg={isSelected ? 'var(--mantine-color-blue-light)' : undefined}
    onClick={onClick}
  >
    <Stack gap="xs" style={{ flex: 1 }}>
      <Group justify="space-between" align="center">
        <Group gap="xs">
          <Text fw={500}>{name}</Text>
          {isRecommended && (
            <Badge variant="light" color="blue" size="sm">
              Recommended
            </Badge>
          )}
        </Group>
        <Badge variant="light" color="gray" size="sm">
          {size}
        </Badge>
      </Group>
      <Text size="sm" c="dimmed">
        {description}
      </Text>

      {isSelected && (
        <Group justify="center" pt="sm">
          <Button
            onClick={onDownload}
            disabled={isDownloading}
            leftSection={
              isDownloading ? (
                <Loader size="1rem" />
              ) : (
                <IconDownload size="1rem" />
              )
            }
            size="sm"
            radius="md"
            fullWidth
          >
            {isDownloading ? 'Downloading...' : 'Download'}
          </Button>
        </Group>
      )}
    </Stack>
  </Card>
);
