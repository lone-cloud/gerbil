import { Stack, Text, Group, Button, Select, Badge } from '@mantine/core';
import {
  useState,
  useCallback,
  forwardRef,
  type ComponentPropsWithoutRef,
} from 'react';
import { Save, File, Plus, Check } from 'lucide-react';
import type { ConfigFile } from '@/types';
import styles from '@/styles/layout.module.css';
import { CreateConfigModal } from './CreateConfigModal';

interface ConfigFileManagerProps {
  configFiles: ConfigFile[];
  selectedFile: string | null;
  onFileSelection: (fileName: string) => Promise<void>;
  onCreateNewConfig: (configName: string) => Promise<void>;
  onSaveConfig: () => Promise<boolean>;
  onLoadConfigFiles: () => Promise<void>;
}

interface SelectItemProps extends ComponentPropsWithoutRef<'div'> {
  label: string;
  extension: string;
}

const getBadgeColor = (extension: string) => {
  switch (extension.toLowerCase()) {
    case '.kcpps':
      return 'blue';
    case '.kcppt':
      return 'green';
    default:
      return 'gray';
  }
};

const SelectItem = forwardRef<HTMLDivElement, SelectItemProps>(
  ({ label, extension, ...others }, ref) => (
    <div ref={ref} {...others}>
      <Group justify="space-between" wrap="nowrap">
        <Text size="sm" truncate>
          {label}
        </Text>
        <Badge size="xs" variant="light" color={getBadgeColor(extension)}>
          {extension}
        </Badge>
      </Group>
    </div>
  )
);

SelectItem.displayName = 'SelectItem';

export const ConfigFileManager = ({
  configFiles,
  selectedFile,
  onFileSelection,
  onCreateNewConfig,
  onSaveConfig,
}: ConfigFileManagerProps) => {
  const [configModalOpened, setConfigModalOpened] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

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
          <div className={styles.flex1}>
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
              renderOption={({ option }) => {
                const dataItem = selectData.find(
                  (item) => item.value === option.value
                );
                const extension = dataItem?.extension || '';
                return (
                  <SelectItem label={option.label} extension={extension} />
                );
              }}
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
        </Group>
      </Stack>

      <CreateConfigModal
        opened={configModalOpened}
        onClose={handleCloseConfigModal}
        onCreateConfig={onCreateNewConfig}
        existingConfigNames={existingConfigNames}
      />
    </>
  );
};
