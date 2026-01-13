import { Button, Group, Stack, TextInput } from '@mantine/core';
import { useState } from 'react';
import { Modal } from '@/components/Modal';

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
    trimmedConfigName && existingConfigNames.includes(trimmedConfigName.toLowerCase());

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

  return (
    <Modal opened={opened} onClose={handleClose} title="Create New Configuration" size="sm">
      <Stack gap="md">
        <TextInput
          label="Name"
          placeholder="Enter a name for the new configuration"
          value={newConfigName}
          onChange={(event) => setNewConfigName(event.currentTarget.value)}
          data-autofocus
          error={configNameExists ? 'A configuration with this name already exists' : undefined}
        />
        <Group justify="flex-end" gap="sm">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            disabled={!trimmedConfigName || !!configNameExists}
            onClick={() => void handleSubmit()}
          >
            Create
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};
