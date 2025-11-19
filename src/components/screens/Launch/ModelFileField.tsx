import { useEffect, useState } from 'react';
import {
  Group,
  ActionIcon,
  Tooltip,
  Button,
  Combobox,
  useCombobox,
  TextInput,
} from '@mantine/core';
import { File, Search, Info } from 'lucide-react';
import { LabelWithTooltip } from '@/components/LabelWithTooltip';
import { ModelAnalysisModal } from '@/components/screens/Launch/ModelAnalysisModal';
import { getInputValidationState } from '@/utils/validation';
import { logError } from '@/utils/logger';
import type { ModelAnalysis, ModelParamType, CachedModel } from '@/types';

interface ModelFileFieldProps {
  label: string;
  value: string;
  placeholder: string;
  tooltip?: string;
  onChange: (value: string) => void;
  onSelectFile: () => void;
  searchUrl?: string;
  showAnalyze?: boolean;
  paramType: ModelParamType;
}

export const ModelFileField = ({
  label,
  value,
  placeholder,
  tooltip,
  onChange,
  onSelectFile,
  searchUrl,
  showAnalyze = false,
  paramType,
}: ModelFileFieldProps) => {
  const validationState = getInputValidationState(value);
  const [analysisModalOpened, setAnalysisModalOpened] = useState(false);
  const [modelAnalysis, setModelAnalysis] = useState<ModelAnalysis | null>(
    null
  );
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState<string>();
  const [cachedModels, setCachedModels] = useState<CachedModel[]>([]);
  const combobox = useCombobox();

  useEffect(() => {
    (async () => {
      try {
        const models =
          await window.electronAPI.kobold.getLocalModels(paramType);
        setCachedModels(models);
      } catch (error) {
        logError('Failed to load cached models:', error as Error);
      }
    })();
  }, [paramType]);

  const options = cachedModels.map((model) => (
    <Combobox.Option value={model.path} key={model.path}>
      {model.author}/{model.model}
    </Combobox.Option>
  ));

  const getHelperText = () => {
    if (validationState === 'neutral') return undefined;

    if (validationState === 'invalid') {
      return 'Enter a valid URL or file path';
    }

    return undefined;
  };

  const handleAnalyzeModel = async () => {
    if (validationState === 'neutral' || validationState === 'invalid') return;

    setAnalysisModalOpened(true);
    setAnalysisLoading(true);
    setAnalysisError(undefined);
    setModelAnalysis(null);

    try {
      const analysis = await window.electronAPI.kobold.analyzeModel(value);
      setModelAnalysis(analysis);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to analyze model';
      setAnalysisError(errorMessage);
      logError('Failed to analyze model:', error as Error);
    } finally {
      setAnalysisLoading(false);
    }
  };

  return (
    <div>
      <LabelWithTooltip label={label} tooltip={tooltip} />
      <Group gap="xs" align="flex-start">
        <div style={{ flex: 1 }}>
          <Combobox
            store={combobox}
            onOptionSubmit={(val) => {
              onChange(val);
              combobox.closeDropdown();
            }}
          >
            <Combobox.Target>
              <TextInput
                placeholder={placeholder}
                value={value}
                onChange={(event) => {
                  onChange(event.currentTarget.value);
                  combobox.openDropdown();
                }}
                onFocus={() => combobox.openDropdown()}
                onBlur={() => combobox.closeDropdown()}
                error={
                  validationState === 'invalid' ? getHelperText() : undefined
                }
                rightSection={<Combobox.Chevron />}
                rightSectionPointerEvents="none"
              />
            </Combobox.Target>

            {options.length > 0 && (
              <Combobox.Dropdown>
                <Combobox.Options>{options}</Combobox.Options>
              </Combobox.Dropdown>
            )}
          </Combobox>
        </div>
        <Button
          onClick={onSelectFile}
          variant="light"
          leftSection={<File size={16} />}
        >
          Browse
        </Button>
        {searchUrl && (
          <Tooltip label="Search Hugging Face">
            <ActionIcon
              onClick={() => window.electronAPI.app.openExternal(searchUrl)}
              variant="outline"
              size="lg"
            >
              <Search size={16} />
            </ActionIcon>
          </Tooltip>
        )}
        {showAnalyze && (
          <Tooltip
            label={
              validationState === 'neutral' || validationState === 'invalid'
                ? 'Enter a valid model path'
                : 'Analyze model'
            }
          >
            <ActionIcon
              onClick={handleAnalyzeModel}
              variant="light"
              color="blue"
              size="lg"
              disabled={
                validationState === 'neutral' || validationState === 'invalid'
              }
            >
              <Info size={16} />
            </ActionIcon>
          </Tooltip>
        )}
      </Group>

      <ModelAnalysisModal
        opened={analysisModalOpened}
        onClose={() => setAnalysisModalOpened(false)}
        analysis={modelAnalysis}
        loading={analysisLoading}
        error={analysisError}
      />
    </div>
  );
};
