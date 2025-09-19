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
import type { DownloadItem } from '@/types/electron';
import type { BinaryUpdateInfo } from '@/hooks/useUpdateChecker';
import { useKoboldVersions } from '@/hooks/useKoboldVersions';
import { getDisplayNameFromPath } from '@/utils/version';
import { GITHUB_API, MODAL_STYLES_WITH_TITLEBAR } from '@/constants';
import { safeExecute } from '@/utils/logger';

interface UpdateAvailableModalProps {
  opened: boolean;
  onClose: () => void;
  updateInfo?: BinaryUpdateInfo;
  onUpdate: (download: DownloadItem) => Promise<void>;
}

export const UpdateAvailableModal = ({
  opened,
  onClose,
  updateInfo,
  onUpdate,
}: UpdateAvailableModalProps) => {
  const { downloading, downloadProgress } = useKoboldVersions();
  const currentVersion = updateInfo?.currentVersion;
  const availableUpdate = updateInfo?.availableUpdate;
  const [isUpdating, setIsUpdating] = useState(false);

  const isDownloading =
    !!availableUpdate && downloading === availableUpdate.name;
  const currentProgress = availableUpdate
    ? downloadProgress[availableUpdate.name] || 0
    : 0;

  const handleUpdate = async () => {
    if (availableUpdate) {
      setIsUpdating(true);
      await safeExecute(async () => {
        await onUpdate(availableUpdate);
        onClose();
      }, 'Failed to update:');
    }
    setIsUpdating(false);
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
      styles={MODAL_STYLES_WITH_TITLEBAR}
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
                  {currentVersion?.version}
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
                  {availableUpdate?.version}
                </Text>
              </div>
            </Group>

            {currentVersion && (
              <Text size="xs" c="dimmed">
                Binary: {getDisplayNameFromPath(currentVersion)}
              </Text>
            )}

            <Group gap="xs" align="center" mt="xs">
              <Text size="xs" c="dimmed">
                View release notes:
              </Text>
              <Anchor
                size="xs"
                href={`https://github.com/${GITHUB_API.KOBOLDCPP_REPO}/releases/tag/v${availableUpdate?.version}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Group gap={4} align="center">
                  <span>v{availableUpdate?.version}</span>
                  <ExternalLink size={12} />
                </Group>
              </Anchor>
            </Group>
          </Stack>
        </Card>

        <Stack gap="xs" style={{ minHeight: '2.75rem' }}>
          <Progress
            value={isDownloading ? Math.min(currentProgress, 100) : 0}
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
              ? `${Math.min(currentProgress, 100).toFixed(1)}% complete`
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
