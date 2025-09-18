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
import { pretifyBinName, isWindowsROCmBuild } from '@/utils/assets';
import { useAppColorScheme } from '@/hooks/useAppColorScheme';

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
  onDownload: (e: MouseEvent<HTMLButtonElement>) => void;
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
  const colorScheme = useAppColorScheme();
  const renderActionButtons = () => {
    const buttons = [];

    if (!isInstalled) {
      return (
        <Button
          key="download"
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

    if (!isCurrent && onMakeCurrent) {
      buttons.push(
        <Button
          key="makeCurrent"
          variant="light"
          size="xs"
          onClick={onMakeCurrent}
        >
          Make Current
        </Button>
      );
    }

    if (hasUpdate && onUpdate) {
      buttons.push(
        <Button
          key="update"
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

    return buttons.length > 0 ? <Stack gap="xs">{buttons}</Stack> : null;
  };

  return (
    <Card
      withBorder
      radius="sm"
      padding="sm"
      {...(isCurrent && {
        bg: colorScheme === 'dark' ? 'dark.6' : 'gray.0',
        bd: `2px solid var(--mantine-color-${colorScheme === 'dark' ? 'blue-4' : 'blue-6'})`,
      })}
    >
      <Group justify="space-between" align="center">
        <div style={{ flex: 1 }}>
          <Group gap="xs" align="center" mb="xs">
            <Text fw={500} size="sm">
              {pretifyBinName(name)}
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
            {isWindowsROCmBuild(name) && (
              <Badge variant="light" color="yellow" size="sm">
                Experimental
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

        {renderActionButtons()}
      </Group>

      {isDownloading && downloadProgress !== undefined && (
        <Stack gap="xs" mt="sm">
          <Progress
            value={Math.min(downloadProgress, 100)}
            color="blue"
            radius="xl"
          />
          <Text size="xs" c="dimmed" ta="center">
            {Math.min(downloadProgress, 100) === 100
              ? '100%'
              : `${Math.min(downloadProgress, 100).toFixed(1)}%`}{' '}
            complete
          </Text>
        </Stack>
      )}
    </Card>
  );
};
