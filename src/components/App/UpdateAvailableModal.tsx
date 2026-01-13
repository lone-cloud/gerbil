import { Anchor, Button, Card, Group, Loader, Progress, Stack, Text } from '@mantine/core';
import { Download, ExternalLink, X } from 'lucide-react';
import { useState } from 'react';
import { Modal } from '@/components/Modal';
import { GITHUB_API } from '@/constants';
import type { BinaryUpdateInfo } from '@/hooks/useUpdateChecker';
import { useKoboldBackendsStore } from '@/stores/koboldBackends';
import type { DownloadItem } from '@/types/electron';
import { pretifyBinName } from '@/utils/assets';
import { formatDownloadSize } from '@/utils/format';
import { safeExecute } from '@/utils/logger';

interface UpdateAvailableModalProps {
  opened: boolean;
  onClose: () => void;
  onSkip: () => void;
  updateInfo?: BinaryUpdateInfo;
  onUpdate: (download: DownloadItem) => Promise<void>;
}

export const UpdateAvailableModal = ({
  opened,
  onClose,
  onSkip,
  updateInfo,
  onUpdate,
}: UpdateAvailableModalProps) => {
  const { downloading, downloadProgress } = useKoboldBackendsStore();
  const currentBackend = updateInfo?.currentBackend;
  const availableUpdate = updateInfo?.availableUpdate;
  const [isUpdating, setIsUpdating] = useState(false);

  const isDownloading = !!availableUpdate && downloading === availableUpdate.name;
  const currentProgress = availableUpdate ? downloadProgress[availableUpdate.name] || 0 : 0;

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
      title="A Backend Update is Available"
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
                  {currentBackend?.version}
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

            {availableUpdate?.name && (
              <Text size="xs" c="dimmed">
                Backend Type: {pretifyBinName(availableUpdate?.name)}
              </Text>
            )}

            {availableUpdate?.size && (
              <Text size="xs" c="dimmed">
                Update Size: {formatDownloadSize(availableUpdate.size, availableUpdate.url)}
              </Text>
            )}

            <Anchor
              size="xs"
              href={`${GITHUB_API.GITHUB_BASE_URL}/${GITHUB_API.KOBOLDCPP_REPO}/releases/tag/v${availableUpdate?.version}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Group gap={4} align="center">
                <span>View Release Notes</span>
                <ExternalLink size={12} />
              </Group>
            </Anchor>
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
            onClick={onSkip}
            disabled={isDownloading || isUpdating}
            leftSection={<X size={16} />}
          >
            Skip
          </Button>

          <Button
            onClick={() => void handleUpdate()}
            loading={isDownloading || isUpdating}
            disabled={isDownloading || isUpdating}
            leftSection={
              isDownloading || isUpdating ? <Loader size="1rem" /> : <Download size={16} />
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
