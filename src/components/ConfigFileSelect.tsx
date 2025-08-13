import { Select, Text, Badge, Group } from '@mantine/core';
import { File } from 'lucide-react';
import { forwardRef, type ComponentPropsWithoutRef } from 'react';
import type { ConfigFile } from '@/types';

interface ConfigFileSelectProps {
  configFiles: ConfigFile[];
  selectedFile: string | null;
  loading: boolean;
  onFileSelection: (fileName: string) => void;
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

export const ConfigFileSelect = ({
  configFiles,
  selectedFile,
  loading,
  onFileSelection,
}: ConfigFileSelectProps) => {
  if (loading) {
    return (
      <Text c="dimmed" ta="center">
        Loading configuration files...
      </Text>
    );
  }

  if (configFiles.length === 0) {
    return (
      <Text c="dimmed" ta="center">
        No configuration files found in the installation directory.
        <br />
        Please ensure your .kcpps or .kcppt files are in the correct location.
      </Text>
    );
  }

  const selectData = configFiles.map((file) => {
    const extension = file.name.split('.').pop() || '';
    const nameWithoutExtension = file.name.replace(`.${extension}`, '');

    return {
      value: file.name,
      label: nameWithoutExtension, // Clean label for selected value
      extension: `.${extension}`, // Store extension separately
    };
  });

  return (
    <Select
      label="Configuration File"
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
        // Find the original data item to get the extension
        const dataItem = selectData.find((item) => item.value === option.value);
        const extension = dataItem?.extension || '';
        return <SelectItem label={option.label} extension={extension} />;
      }}
    />
  );
};
