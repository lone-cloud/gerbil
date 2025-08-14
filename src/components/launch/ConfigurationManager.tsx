import {
  Stack,
  Text,
  Group,
  Button,
  ActionIcon,
  Menu,
  Select,
  Badge,
} from '@mantine/core';
import { RotateCcw, Save, Settings2, File } from 'lucide-react';
import { forwardRef, type ComponentPropsWithoutRef } from 'react';
import type { ConfigFile } from '@/types';

interface ConfigurationManagerProps {
  configFiles: ConfigFile[];
  selectedFile: string | null;
  onFileSelection: (fileName: string) => void;
  onRefresh: () => void;
  onSaveAsNew: () => void;
  onUpdateCurrent: () => void;
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
        <ActionIcon
          variant="light"
          onClick={onRefresh}
          size="lg"
          aria-label="Refresh configuration files"
          title="Refresh configuration files"
        >
          <RotateCcw size={16} />
        </ActionIcon>
      </Group>
    </Group>

    {configFiles.length === 0 ? (
      <Text c="dimmed" ta="center">
        No configuration files found in the installation directory.
        <br />
        Please ensure your .kcpps or .kcppt files are in the correct location.
      </Text>
    ) : (
      (() => {
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
          <Select
            placeholder="Select a configuration file"
            value={selectedFile}
            onChange={(value) => value && onFileSelection(value)}
            data={selectData}
            leftSection={<File size={16} />}
            searchable
            clearable={false}
            w="100%"
            filter={({ options, search }) =>
              options.filter((option) => {
                if ('label' in option) {
                  return option.label
                    .toLowerCase()
                    .includes(search.toLowerCase().trim());
                }
                return false;
              })
            }
            renderOption={({ option }) => {
              const dataItem = selectData.find(
                (item) => item.value === option.value
              );
              const extension = dataItem?.extension || '';
              return <SelectItem label={option.label} extension={extension} />;
            }}
          />
        );
      })()
    )}
  </Stack>
);
