import { Stack, Text, Group, Button, Select, Tooltip } from '@mantine/core';
import { useState, useCallback } from 'react';
import { Save, File, Plus, Check, Trash2 } from 'lucide-react';
import type { ConfigFile } from '@/types';
import { CreateConfigModal } from './CreateConfigModal';
import { DeleteConfigModal } from './DeleteConfigModal';

interface ConfigFileManagerProps {
  configFiles: ConfigFile[];
  selectedFile: string | null;
  onFileSelection: (fileName: string) => Promise<void>;
  onCreateNewConfig: (configName: string) => Promise<void>;
  onSaveConfig: () => Promise<boolean>;
  onDeleteConfig: (fileName: string) => Promise<boolean>;
  onLoadConfigFiles: () => Promise<void>;
}

export const ConfigFileManager = ({
  configFiles,
  selectedFile,
  onFileSelection,
  onCreateNewConfig,
  onSaveConfig,
  onDeleteConfig,
}: ConfigFileManagerProps) => {
  const [configModalOpened, setConfigModalOpened] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [deleteModalOpened, setDeleteModalOpened] = useState(false);
  const [configToDelete, setConfigToDelete] = useState<string | null>(null);

  const existingConfigNames = configFiles.map((file) => {
    const extension = file.name.split('.').pop() || '';
    return file.name.replace(`.${extension}`, '').toLowerCase();
  });

  const handleOpenConfigModal = () => {
    setConfigModalOpened(true);
  };

  const handleCloseConfigModal = useCallback(() => {
    setConfigModalOpened(false);
  }, []);

  const handleDeleteClick = () => {
    if (selectedFile) {
      setConfigToDelete(selectedFile);
      setDeleteModalOpened(true);
    }
  };

  const handleDeleteConfirm = async () => {
    if (configToDelete) {
      const success = await onDeleteConfig(configToDelete);
      if (success) {
        setConfigToDelete(null);
        setDeleteModalOpened(false);
      }
    }
  };

  const handleDeleteCancel = () => {
    setConfigToDelete(null);
    setDeleteModalOpened(false);
  };

  const handleSaveClick = async () => {
    if (selectedFile) {
      const success = await onSaveConfig();
      if (success) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 1500);
      }
    } else {
      handleOpenConfigModal();
    }
  };

  const selectData = configFiles.map((file) => {
    const extension = file.name.split('.').pop() || '';
    const nameWithoutExtension = file.name.replace(`.${extension}`, '');

    return {
      value: file.name,
      label: nameWithoutExtension,
      extension: `.${extension}`,
    };
  });

  return (
    <>
      <Stack gap="xs">
        <Text fw={500} size="sm">
          Configuration
        </Text>
        <Group gap="xs" align="flex-end">
          <div style={{ flex: 1 }}>
            <Select
              placeholder="Select a configuration file"
              value={selectedFile}
              onChange={(value: string | null) => {
                if (value === '__new__') {
                  return;
                }
                if (value) {
                  onFileSelection(value);
                }
              }}
              data={selectData}
              leftSection={<File size={16} />}
              searchable
              clearable={false}
            />
          </div>
          <Button
            variant="light"
            leftSection={<Plus size={14} />}
            size="sm"
            onClick={() => handleOpenConfigModal()}
          >
            New
          </Button>

          <Button
            variant="outline"
            leftSection={saveSuccess ? <Check size={14} /> : <Save size={14} />}
            size="sm"
            onClick={handleSaveClick}
            color={saveSuccess ? 'green' : undefined}
            style={{ width: '6rem' }}
          >
            {saveSuccess ? 'Saved!' : 'Save'}
          </Button>

          <Tooltip label="Delete Configuration">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDeleteClick}
              disabled={!selectedFile}
              color="red"
              style={{ width: '2.5rem', padding: '0 0.5rem' }}
            >
              <Trash2 size={16} />
            </Button>
          </Tooltip>
        </Group>
      </Stack>

      <CreateConfigModal
        opened={configModalOpened}
        onClose={handleCloseConfigModal}
        onCreateConfig={onCreateNewConfig}
        existingConfigNames={existingConfigNames}
      />

      <DeleteConfigModal
        opened={deleteModalOpened}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        configName={configToDelete}
      />
    </>
  );
};
