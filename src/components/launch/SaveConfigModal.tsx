import { Modal, Stack, TextInput, Group, Button } from '@mantine/core';
import { Save } from 'lucide-react';

interface SaveConfigModalProps {
  opened: boolean;
  onClose: () => void;
  configName: string;
  onConfigNameChange: (name: string) => void;
  onSave: () => void;
}

export const SaveConfigModal = ({
  opened,
  onClose,
  configName,
  onConfigNameChange,
  onSave,
}: SaveConfigModalProps) => (
  <Modal opened={opened} onClose={onClose} title="Save Configuration" size="sm">
    <Stack gap="md">
      <TextInput
        label="Configuration Name"
        placeholder="Enter a name for this configuration"
        value={configName}
        onChange={(event) => onConfigNameChange(event.currentTarget.value)}
        data-autofocus
      />
      <Group justify="flex-end" gap="sm">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button
          disabled={!configName.trim()}
          leftSection={<Save size={16} />}
          onClick={onSave}
        >
          Save Configuration
        </Button>
      </Group>
    </Stack>
  </Modal>
);
