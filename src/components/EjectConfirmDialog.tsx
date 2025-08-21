import { useState } from 'react';
import { Modal, Text, Group, Button, Checkbox, Stack } from '@mantine/core';

interface EjectConfirmDialogProps {
  opened: boolean;
  onClose: () => void;
  onConfirm: (skipConfirmation: boolean) => void;
}

export const EjectConfirmDialog = ({
  opened,
  onClose,
  onConfirm,
}: EjectConfirmDialogProps) => {
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
