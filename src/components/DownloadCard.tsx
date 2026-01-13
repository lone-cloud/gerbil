import { Badge, Button, Card, Group, Loader, Progress, rem, Stack, Text } from '@mantine/core';
import { Download, Trash2 } from 'lucide-react';
import type { MouseEvent } from 'react';
import { useKoboldBackendsStore } from '@/stores/koboldBackends';
import { usePreferencesStore } from '@/stores/preferences';
import type { BackendInfo } from '@/types';
import { isWindowsROCmBuild, pretifyBinName } from '@/utils/assets';

interface DownloadCardProps {
  backend: BackendInfo;
  size: string;
  description?: string;
  disabled?: boolean;
  onDownload: (e: MouseEvent<HTMLButtonElement>) => void;
  onMakeCurrent?: () => void;
  onUpdate?: (e: MouseEvent<HTMLButtonElement>) => void;
  onRedownload?: (e: MouseEvent<HTMLButtonElement>) => void;
  onDelete?: (e: MouseEvent<HTMLButtonElement>) => void;
}

export const DownloadCard = ({
  backend,
  size,
  description,
  disabled = false,
  onDownload,
  onMakeCurrent,
  onUpdate,
  onRedownload,
  onDelete,
}: DownloadCardProps) => {
  const { resolvedColorScheme: colorScheme } = usePreferencesStore();
  const { downloading, downloadProgress } = useKoboldBackendsStore();

  const isLoading = downloading === backend.name;
  const currentProgress = isLoading ? Math.min(downloadProgress[backend.name], 100) || 0 : 0;
  const hasVersionMismatch = Boolean(
    backend.version && backend.actualVersion && backend.version !== backend.actualVersion
  );

  const renderActionButtons = () => {
    const buttons = [];

    if (!backend.isInstalled) {
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

    if (!backend.isCurrent && onMakeCurrent) {
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

    if (backend.hasUpdate && onUpdate) {
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
          {isLoading ? 'Updating...' : `Update to ${backend.newerVersion}`}
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

    if (onDelete && backend.isInstalled && !backend.isCurrent) {
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
      {...(backend.isCurrent && {
        bg: colorScheme === 'dark' ? 'dark.6' : 'gray.0',
        bd: `2px solid var(--mantine-color-${colorScheme === 'dark' ? 'blue-4' : 'blue-6'})`,
      })}
    >
      <Group justify="space-between" align="center">
        <div style={{ flex: 1 }}>
          <Group gap="xs" align="center" mb="xs">
            <Text fw={500} size="sm">
              {pretifyBinName(backend.name)}
            </Text>
            {backend.isCurrent && (
              <Badge variant="light" color="blue" size="sm">
                Current
              </Badge>
            )}
            {backend.hasUpdate && (
              <Badge variant="light" color="orange" size="sm">
                Update Available
              </Badge>
            )}
            {isWindowsROCmBuild(backend.name) && (
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
            {backend.version && (
              <Text size="xs" c="dimmed">
                Version {backend.version}
                {hasVersionMismatch && backend.actualVersion && (
                  <span style={{ color: 'var(--mantine-color-red-6)' }}>
                    {' '}
                    (actual: {backend.actualVersion})
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

      {isLoading && currentProgress !== undefined && (
        <Stack gap="xs" mt="sm">
          <Progress value={currentProgress} color="blue" radius="xl" />
          <Text size="xs" c="dimmed" ta="center">
            {currentProgress === 100
              ? '100.0% complete'
              : `${currentProgress.toFixed(1).padStart(5, ' ')}% complete`}
          </Text>
        </Stack>
      )}
    </Card>
  );
};
