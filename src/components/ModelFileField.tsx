import { Group, TextInput, Button } from '@mantine/core';
import { File, Search } from 'lucide-react';
import { SectionHeader } from '@/components/SectionHeader';
import { getInputValidationState } from '@/utils';
import styles from '@/styles/layout.module.css';

interface ModelFileFieldProps {
  label: string;
  value: string;
  placeholder: string;
  tooltip?: string;
  onChange: (value: string) => void;
  onSelectFile: () => void;
  showSearchHF?: boolean;
  searchUrl?: string;
}

export const ModelFileField = ({
  label,
  value,
  placeholder,
  tooltip,
  onChange,
  onSelectFile,
  showSearchHF = false,
  searchUrl = 'https://huggingface.co/models?pipeline_tag=text-to-image&library=gguf&sort=trending',
}: ModelFileFieldProps) => {
  const validationState = getInputValidationState(value);

  const getHelperText = () => {
    if (!value.trim()) return undefined;

    if (validationState === 'invalid') {
      return 'Enter a valid URL or file path';
    }

    return undefined;
  };

  return (
    <div>
      <SectionHeader
        title={label}
        tooltip={tooltip}
        fontWeight={500}
        marginBottom="xs"
      />
      <Group gap="xs" align="flex-start">
        <div className={styles.flex1}>
          <TextInput
            placeholder={placeholder}
            value={value}
            onChange={(event) => onChange(event.currentTarget.value)}
            error={validationState === 'invalid' ? getHelperText() : undefined}
          />
        </div>
        <Button
          onClick={onSelectFile}
          variant="light"
          leftSection={<File size={16} />}
        >
          Browse
        </Button>
        {showSearchHF && (
          <Button
            onClick={() => {
              window.electronAPI.app.openExternal(searchUrl);
            }}
            variant="outline"
            leftSection={<Search size={16} />}
          >
            Search HF
          </Button>
        )}
      </Group>
    </div>
  );
};
