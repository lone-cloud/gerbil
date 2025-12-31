import { Text, Group, Button, Stack } from '@mantine/core';
import { Modal } from '@/components/Modal';
import { stripFileExtension } from '@/utils/format';

interface DeleteConfigModalProps {
  opened: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  configName: string | null;
}

export const DeleteConfigModal = ({
  opened,
  onClose,
  onConfirm,
  configName,
}: DeleteConfigModalProps) => {
  const displayName = configName ? stripFileExtension(configName) : '';

  return (
    <Modal opened={opened} onClose={onClose} title="Delete Configuration">
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          Are you sure you want to delete &ldquo;{displayName}&rdquo;? This
          action cannot be undone.
        </Text>

        <Group justify="flex-end" gap="sm">
          <Button variant="subtle" onClick={onClose}>
            Cancel
          </Button>
          <Button color="red" onClick={() => void onConfirm()}>
            Delete
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};
