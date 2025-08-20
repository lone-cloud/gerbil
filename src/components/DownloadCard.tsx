import {
  Card,
  Stack,
  Group,
  Text,
  Badge,
  Button,
  Loader,
  Progress,
  rem,
} from '@mantine/core';
import { Download } from 'lucide-react';
import { MouseEvent } from 'react';
import styles from '@/styles/layout.module.css';

interface DownloadCardProps {
  name: string;
  size: string;
  version?: string;
  description?: string;
  isCurrent?: boolean;
  isInstalled?: boolean;
  isDownloading?: boolean;
  downloadProgress?: number;
  disabled?: boolean;
  hasUpdate?: boolean;
  newerVersion?: string;
  onDownload?: (e: MouseEvent<HTMLButtonElement>) => void;
  onMakeCurrent?: () => void;
  onUpdate?: (e: MouseEvent<HTMLButtonElement>) => void;
}

export const DownloadCard = ({
  name,
  size,
  version,
  description,
  isCurrent = false,
  isInstalled = false,
  isDownloading = false,
  downloadProgress = 0,
  disabled = false,
  hasUpdate = false,
  newerVersion,
  onDownload,
  onMakeCurrent,
  onUpdate,
}: DownloadCardProps) => {
  const renderActionButton = () => {
    if (hasUpdate && onUpdate) {
      return (
        <Button
          variant="filled"
          size="xs"
          onClick={onUpdate}
          loading={isDownloading}
          disabled={disabled}
          color="orange"
          leftSection={
            isDownloading ? (
              <Loader size="1rem" />
            ) : (
              <Download style={{ width: rem(14), height: rem(14) }} />
            )
          }
        >
          {isDownloading ? 'Updating...' : `Update to ${newerVersion}`}
        </Button>
      );
    }

    if (!isInstalled && onDownload) {
      return (
        <Button
          variant="filled"
          size="xs"
          onClick={onDownload}
          loading={isDownloading}
          disabled={disabled}
          leftSection={
            isDownloading ? (
              <Loader size="1rem" />
            ) : (
              <Download style={{ width: rem(14), height: rem(14) }} />
            )
          }
        >
          {isDownloading ? 'Downloading...' : 'Download'}
        </Button>
      );
    }

    if (isInstalled && !isCurrent && onMakeCurrent) {
      return (
        <Button variant="light" size="xs" onClick={onMakeCurrent}>
          Make Current
        </Button>
      );
    }

    return null;
  };

  return (
    <Card
      withBorder
      radius="sm"
      padding="sm"
      bd={isCurrent ? '2px solid var(--mantine-color-blue-filled)' : undefined}
      bg={isCurrent ? 'var(--mantine-color-blue-light)' : undefined}
    >
      <Group justify="space-between" align="center">
        <div className={styles.flex1}>
          <Group gap="xs" align="center" mb="xs">
            <Text fw={500} size="sm">
              {name}
            </Text>
            {isCurrent && (
              <Badge variant="light" color="blue" size="sm">
                Current
              </Badge>
            )}
            {hasUpdate && (
              <Badge variant="light" color="orange" size="sm">
                Update Available
              </Badge>
            )}
          </Group>
          {description && (
            <Text size="xs" c="dimmed" mb="xs">
              {description}
            </Text>
          )}
          <Group gap="xs" align="center">
            {version && (
              <Text size="xs" c="dimmed">
                Version {version}
              </Text>
            )}
            {size && (
              <>
                <Text size="xs" c="dimmed">
                  •
                </Text>
                <Badge variant="light" color="gray" size="xs">
                  {size}
                </Badge>
              </>
            )}
          </Group>
        </div>

        {renderActionButton()}
      </Group>

      {isDownloading && downloadProgress !== undefined && (
        <Stack gap="xs" mt="sm">
          <Progress
            value={Math.min(downloadProgress, 100)}
            color="blue"
            radius="xl"
          />
          <Text size="xs" c="dimmed" ta="center">
            {Math.min(downloadProgress, 100).toFixed(1)}% complete
          </Text>
        </Stack>
      )}
    </Card>
  );
};
