import { MODAL_STYLES_WITH_TITLEBAR } from '@/constants';
import { Modal, TextInput, Group, Button, Stack } from '@mantine/core';
import { useState, useEffect } from 'react';

interface CreateConfigModalProps {
  opened: boolean;
  onClose: () => void;
  onCreateConfig: (configName: string) => Promise<void>;
  existingConfigNames: string[];
}

export const CreateConfigModal = ({
  opened,
  onClose,
  onCreateConfig,
  existingConfigNames,
}: CreateConfigModalProps) => {
  const [newConfigName, setNewConfigName] = useState('');

  const trimmedConfigName = newConfigName.trim();
  const configNameExists =
    trimmedConfigName &&
    existingConfigNames.includes(trimmedConfigName.toLowerCase());

  const handleClose = () => {
    setNewConfigName('');
    onClose();
  };

  const handleSubmit = async () => {
    const configName = trimmedConfigName;
    setNewConfigName('');
    await onCreateConfig(configName);
    onClose();
  };

  useEffect(() => {
    if (opened) {
      setNewConfigName('');
    }
  }, [opened]);

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title="Create New Configuration"
      size="sm"
      styles={MODAL_STYLES_WITH_TITLEBAR}
    >
      <Stack gap="md">
        <TextInput
          label="Name"
          placeholder="Enter a name for the new configuration"
          value={newConfigName}
          onChange={(event) => setNewConfigName(event.currentTarget.value)}
          data-autofocus
          error={
            configNameExists
              ? 'A configuration with this name already exists'
              : undefined
          }
        />
        <Group justify="flex-end" gap="sm">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            disabled={!trimmedConfigName || !!configNameExists}
            onClick={handleSubmit}
          >
            Create
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};
