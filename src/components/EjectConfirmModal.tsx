import { useState } from 'react';
import { Modal, Text, Group, Button, Checkbox, Stack } from '@mantine/core';
import { MODAL_STYLES_WITH_TITLEBAR } from '@/constants';

interface EjectConfirmModalProps {
  opened: boolean;
  onClose: () => void;
  onConfirm: (skipConfirmation: boolean) => void;
}

export const EjectConfirmModal = ({
  opened,
  onClose,
  onConfirm,
}: EjectConfirmModalProps) => {
  const [skipConfirmation, setSkipConfirmation] = useState(false);

  const handleConfirm = () => {
    onConfirm(skipConfirmation);
    onClose();
  };

  const handleClose = () => {
    setSkipConfirmation(false);
    onClose();
  };

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title="Are you sure you want to eject?"
      centered
      closeOnClickOutside={false}
      closeOnEscape={false}
      styles={MODAL_STYLES_WITH_TITLEBAR}
    >
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          This will terminate the running process and return to the launch
          screen.
        </Text>

        <Checkbox
          label="Don't ask me again"
          checked={skipConfirmation}
          onChange={(event) => setSkipConfirmation(event.currentTarget.checked)}
        />

        <Group justify="flex-end" gap="sm">
          <Button variant="subtle" onClick={handleClose}>
            Cancel
          </Button>
          <Button color="red" onClick={handleConfirm}>
            Eject
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};
