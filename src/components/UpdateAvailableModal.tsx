import {
  Modal,
  Stack,
  Text,
  Group,
  Button,
  Card,
  Loader,
  Anchor,
  Progress,
} from '@mantine/core';
import { Download, X, ExternalLink } from 'lucide-react';
import { useState } from 'react';
import type { InstalledVersion, DownloadItem } from '@/types/electron';
import { getDisplayNameFromPath } from '@/utils/versionUtils';
import { GITHUB_API } from '@/constants';

interface UpdateAvailableModalProps {
  opened: boolean;
  onClose: () => void;
  currentVersion: InstalledVersion;
  availableUpdate: DownloadItem;
  onUpdate: (download: DownloadItem) => Promise<void>;
  isDownloading?: boolean;
  downloadProgress?: number;
}

export const UpdateAvailableModal = ({
  opened,
  onClose,
  currentVersion,
  availableUpdate,
  onUpdate,
  isDownloading = false,
  downloadProgress = 0,
}: UpdateAvailableModalProps) => {
  const [isUpdating, setIsUpdating] = useState(false);

  const handleUpdate = async () => {
    try {
      setIsUpdating(true);
      await onUpdate(availableUpdate);
      onClose();
    } catch (error) {
      window.electronAPI.logs.logError('Failed to update:', error as Error);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      size="sm"
      title="A newer version is available"
      centered
      closeOnClickOutside={false}
      closeOnEscape={!isDownloading && !isUpdating}
    >
      <Stack gap="md">
        <Card withBorder radius="md" p="md" bd="2px solid orange">
          <Stack gap="xs">
            <Group gap="md" align="center">
              <div>
                <Text size="xs" c="dimmed">
                  Current Version
                </Text>
                <Text fw={500} size="sm">
                  {currentVersion.version}
                </Text>
              </div>

              <Text size="lg" c="orange" fw={500}>
                →
              </Text>

              <div>
                <Text size="xs" c="dimmed">
                  Available Version
                </Text>
                <Text fw={500} size="sm" c="orange">
                  {availableUpdate.version}
                </Text>
              </div>
            </Group>

            <Text size="xs" c="dimmed">
              Binary: {getDisplayNameFromPath(currentVersion)}
            </Text>

            <Group gap="xs" align="center" mt="xs">
              <Text size="xs" c="dimmed">
                View release notes:
              </Text>
              <Anchor
                size="xs"
                href={`https://github.com/${GITHUB_API.KOBOLDCPP_REPO}/releases/tag/v${availableUpdate.version}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() =>
                  window.electronAPI.app.openExternal(
                    `https://github.com/${GITHUB_API.KOBOLDCPP_REPO}/releases/tag/v${availableUpdate.version}`
                  )
                }
              >
                <Group gap={4} align="center">
                  <span>v{availableUpdate.version}</span>
                  <ExternalLink size={12} />
                </Group>
              </Anchor>
            </Group>
          </Stack>
        </Card>

        <Stack gap="xs" style={{ minHeight: '2.75rem' }}>
          <Progress
            value={isDownloading ? Math.min(downloadProgress, 100) : 0}
            color="orange"
            radius="xl"
            style={{
              opacity: isDownloading || isUpdating ? 1 : 0,
              transition: 'opacity 200ms ease',
            }}
          />
          <Text
            size="xs"
            c="dimmed"
            ta="center"
            style={{
              opacity: isDownloading || isUpdating ? 1 : 0,
              transition: 'opacity 200ms ease',
            }}
          >
            {isDownloading
              ? `${Math.min(downloadProgress, 100).toFixed(1)}% complete`
              : 'Preparing update...'}
          </Text>
        </Stack>

        <Group justify="flex-end" gap="sm">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isDownloading || isUpdating}
            leftSection={<X size={16} />}
          >
            Skip
          </Button>

          <Button
            onClick={handleUpdate}
            loading={isDownloading || isUpdating}
            disabled={isDownloading || isUpdating}
            leftSection={
              isDownloading || isUpdating ? (
                <Loader size="1rem" />
              ) : (
                <Download size={16} />
              )
            }
            color="orange"
          >
            {isDownloading || isUpdating ? 'Updating...' : 'Update Now'}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};
