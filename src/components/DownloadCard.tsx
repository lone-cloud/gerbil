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
import { Download, Trash2 } from 'lucide-react';
import { MouseEvent } from 'react';
import { pretifyBinName, isWindowsROCmBuild } from '@/utils/assets';
import { usePreferencesStore } from '@/stores/preferences';
import type { VersionInfo } from '@/types';

interface DownloadCardProps {
  version: VersionInfo;
  size: string;
  description?: string;
  isLoading?: boolean;
  downloadProgress?: number;
  disabled?: boolean;
  onDownload: (e: MouseEvent<HTMLButtonElement>) => void;
  onMakeCurrent?: () => void;
  onUpdate?: (e: MouseEvent<HTMLButtonElement>) => void;
  onRedownload?: (e: MouseEvent<HTMLButtonElement>) => void;
  onDelete?: (e: MouseEvent<HTMLButtonElement>) => void;
}

export const DownloadCard = ({
  version: versionInfo,
  size,
  description,
  isLoading = false,
  downloadProgress = 0,
  disabled = false,
  onDownload,
  onMakeCurrent,
  onUpdate,
  onRedownload,
  onDelete,
}: DownloadCardProps) => {
  const { resolvedColorScheme: colorScheme } = usePreferencesStore();
  const hasVersionMismatch = Boolean(
    versionInfo.version &&
      versionInfo.actualVersion &&
      versionInfo.version !== versionInfo.actualVersion
  );

  // eslint-disable-next-line sonarjs/cognitive-complexity
  const renderActionButtons = () => {
    const buttons = [];

    if (!versionInfo.isInstalled) {
      return (
        <Button
          key="download"
          variant="filled"
          size="xs"
          onClick={onDownload}
          loading={isLoading}
          disabled={disabled}
          leftSection={
            isLoading ? (
              <Loader size="1rem" />
            ) : (
              <Download style={{ width: rem(14), height: rem(14) }} />
            )
          }
        >
          {isLoading ? 'Downloading...' : 'Download'}
        </Button>
      );
    }

    if (!versionInfo.isCurrent && onMakeCurrent) {
      buttons.push(
        <Button
          key="makeCurrent"
          variant="filled"
          size="xs"
          onClick={onMakeCurrent}
          disabled={disabled}
        >
          Make Current
        </Button>
      );
    }

    if (versionInfo.hasUpdate && onUpdate) {
      buttons.push(
        <Button
          key="update"
          variant="filled"
          size="xs"
          onClick={onUpdate}
          loading={isLoading}
          disabled={disabled}
          color="orange"
          leftSection={
            isLoading ? (
              <Loader size="1rem" />
            ) : (
              <Download style={{ width: rem(14), height: rem(14) }} />
            )
          }
        >
          {isLoading ? 'Updating...' : `Update to ${versionInfo.newerVersion}`}
        </Button>
      );
    }

    if (hasVersionMismatch && onRedownload) {
      buttons.push(
        <Button
          key="redownload"
          variant="filled"
          size="xs"
          onClick={onRedownload}
          loading={isLoading}
          disabled={disabled}
          color="red"
          leftSection={
            isLoading ? (
              <Loader size="1rem" />
            ) : (
              <Download style={{ width: rem(14), height: rem(14) }} />
            )
          }
        >
          {isLoading ? 'Re-downloading...' : 'Re-download'}
        </Button>
      );
    }

    if (onDelete && versionInfo.isInstalled && !versionInfo.isCurrent) {
      buttons.push(
        <Button
          key="delete"
          variant="light"
          size="xs"
          onClick={onDelete}
          loading={isLoading}
          disabled={disabled}
          color="red"
          leftSection={
            isLoading ? (
              <Loader size="1rem" />
            ) : (
              <Trash2 style={{ width: rem(14), height: rem(14) }} />
            )
          }
        >
          {isLoading ? 'Deleting...' : 'Delete'}
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
      {...(versionInfo.isCurrent && {
        bg: colorScheme === 'dark' ? 'dark.6' : 'gray.0',
        bd: `2px solid var(--mantine-color-${colorScheme === 'dark' ? 'blue-4' : 'blue-6'})`,
      })}
    >
      <Group justify="space-between" align="center">
        <div style={{ flex: 1 }}>
          <Group gap="xs" align="center" mb="xs">
            <Text fw={500} size="sm">
              {pretifyBinName(versionInfo.name)}
            </Text>
            {versionInfo.isCurrent && (
              <Badge variant="light" color="blue" size="sm">
                Current
              </Badge>
            )}
            {versionInfo.hasUpdate && (
              <Badge variant="light" color="orange" size="sm">
                Update Available
              </Badge>
            )}
            {isWindowsROCmBuild(versionInfo.name) && (
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
            {versionInfo.version && (
              <Text size="xs" c="dimmed">
                Version {versionInfo.version}
                {hasVersionMismatch && versionInfo.actualVersion && (
                  <span style={{ color: 'var(--mantine-color-red-6)' }}>
                    {' '}
                    (actual: {versionInfo.actualVersion})
                  </span>
                )}
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

      {isLoading && downloadProgress !== undefined && (
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
