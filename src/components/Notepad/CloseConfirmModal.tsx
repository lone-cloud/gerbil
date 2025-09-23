import { Text, Button, Group } from '@mantine/core';
import { Modal } from '@/components/Modal';

interface CloseConfirmModalProps {
  isOpen: boolean;
  tabTitle: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const CloseConfirmModal = ({
  isOpen,
  tabTitle,
  onConfirm,
  onCancel,
}: CloseConfirmModalProps) => (
  <Modal opened={isOpen} onClose={onCancel} title="Confirm Close Tab" size="sm">
    <Text size="sm" mb="md">
      The tab &ldquo;{tabTitle}&rdquo; contains content. Closing it will
      permanently delete this data. Are you sure you want to close it?
    </Text>
    <Group justify="flex-end">
      <Button variant="subtle" onClick={onCancel}>
        Cancel
      </Button>
      <Button color="red" onClick={onConfirm}>
        Close Tab
      </Button>
    </Group>
  </Modal>
);
