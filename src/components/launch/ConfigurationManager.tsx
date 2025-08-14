import { Stack, Text, Group, Button, ActionIcon, Menu } from '@mantine/core';
import { RotateCcw, Save, Settings2 } from 'lucide-react';
import { ConfigFileSelect } from '@/components/ConfigFileSelect';
import type { ConfigFile } from '@/types';

interface ConfigurationManagerProps {
  configFiles: ConfigFile[];
  selectedFile: string | null;
  onFileSelection: (fileName: string) => void;
  onRefresh: () => void;
  onSaveAsNew: () => void;
  onUpdateCurrent: () => void;
}

export const ConfigurationManager = ({
  configFiles,
  selectedFile,
  onFileSelection,
  onRefresh,
  onSaveAsNew,
  onUpdateCurrent,
}: ConfigurationManagerProps) => (
  <Stack gap="md">
    <Group justify="space-between" align="center">
      <Text fw={500}>Configuration File</Text>
      <Group gap="xs">
        <Menu>
          <Menu.Target>
            <Button variant="light" leftSection={<Save size={16} />}>
              Save
            </Button>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Item leftSection={<Save size={16} />} onClick={onSaveAsNew}>
              Save as new configuration
            </Menu.Item>
            <Menu.Item
              leftSection={<Settings2 size={16} />}
              disabled={!selectedFile}
              onClick={onUpdateCurrent}
            >
              Update current configuration
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
        <ActionIcon variant="light" onClick={onRefresh} size="lg">
          <RotateCcw size={16} />
        </ActionIcon>
      </Group>
    </Group>

    <ConfigFileSelect
      configFiles={configFiles}
      selectedFile={selectedFile}
      onFileSelection={onFileSelection}
    />
  </Stack>
);
