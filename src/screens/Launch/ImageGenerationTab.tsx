import {
  Stack,
  Text,
  Group,
  TextInput,
  Button,
  Select,
  Alert,
} from '@mantine/core';
import { File, Search, AlertTriangle } from 'lucide-react';
import { InfoTooltip } from '@/components/InfoTooltip';
import { getInputValidationState } from '@/utils/validation';
import { IMAGE_MODEL_PRESETS } from '@/utils/imageModelPresets';

interface ImageGenerationTabProps {
  sdmodel: string;
  sdt5xxl: string;
  sdclipl: string;
  sdclipg: string;
  sdphotomaker: string;
  sdvae: string;
  textModelPath?: string;
  onSdmodelChange: (path: string) => void;
  onSelectSdmodelFile: () => void;
  onSdt5xxlChange: (path: string) => void;
  onSelectSdt5xxlFile: () => void;
  onSdcliplChange: (path: string) => void;
  onSelectSdcliplFile: () => void;
  onSdclipgChange: (path: string) => void;
  onSelectSdclipgFile: () => void;
  onSdphotomakerChange: (path: string) => void;
  onSelectSdphotomakerFile: () => void;
  onSdvaeChange: (path: string) => void;
  onSelectSdvaeFile: () => void;
  onApplyPreset: (presetName: string) => void;
}

const ModelField = ({
  label,
  value,
  placeholder,
  tooltip,
  onChange,
  onSelectFile,
  showSearchHF = false,
}: {
  label: string;
  value: string;
  placeholder: string;
  tooltip?: string;
  onChange: (value: string) => void;
  onSelectFile: () => void;
  showSearchHF?: boolean;
}) => {
  const validationState = getInputValidationState(value);

  const getInputColor = () => {
    switch (validationState) {
      case 'valid':
        return 'green';
      case 'invalid':
        return 'red';
      default:
        return undefined;
    }
  };

  const getHelperText = () => {
    if (!value.trim()) return undefined;

    if (validationState === 'invalid') {
      return 'Enter a valid URL or file path';
    }

    return undefined;
  };

  return (
    <div>
      <Group gap="xs" align="center" mb="xs">
        <Text size="sm" fw={500}>
          {label}
        </Text>
        {tooltip && <InfoTooltip label={tooltip} />}
      </Group>
      <Group gap="xs" align="flex-start">
        <div style={{ flex: 1 }}>
          <TextInput
            placeholder={placeholder}
            value={value}
            onChange={(event) => onChange(event.currentTarget.value)}
            color={getInputColor()}
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
              window.electronAPI.app.openExternal(
                'https://huggingface.co/models?pipeline_tag=text-to-image&library=gguf&sort=trending'
              );
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

export const ImageGenerationTab = ({
  sdmodel,
  sdt5xxl,
  sdclipl,
  sdclipg,
  sdphotomaker,
  sdvae,
  textModelPath,
  onSdmodelChange,
  onSelectSdmodelFile,
  onSdt5xxlChange,
  onSelectSdt5xxlFile,
  onSdcliplChange,
  onSelectSdcliplFile,
  onSdclipgChange,
  onSelectSdclipgFile,
  onSdphotomakerChange,
  onSelectSdphotomakerFile,
  onSdvaeChange,
  onSelectSdvaeFile,
  onApplyPreset,
}: ImageGenerationTabProps) => {
  const hasTextModel = textModelPath?.trim() !== '';
  const hasImageModel = sdmodel.trim() !== '';

  return (
    <Stack gap="lg">
      <div>
        <Group gap="xs" align="center" mb="xs">
          <Text size="sm" fw={500}>
            Model Preset
          </Text>
          <InfoTooltip label="Quick presets for popular image generation models with pre-configured encoders." />
        </Group>
        <Select
          placeholder="Choose a preset..."
          data={IMAGE_MODEL_PRESETS.map((preset) => ({
            value: preset.name,
            label: preset.name,
          }))}
          value={null}
          onChange={(value) => {
            if (value) {
              onApplyPreset(value);
            }
          }}
          clearable
        />
      </div>

      {hasTextModel && hasImageModel && (
        <Alert
          color="orange"
          title="Model Priority Notice"
          icon={<AlertTriangle size={16} />}
        >
          Both text and image generation models are selected. The image
          generation model will take priority and be used for launch.
        </Alert>
      )}

      <ModelField
        label="Image Gen. Model File"
        value={sdmodel}
        placeholder="Select a model file or enter a direct URL"
        onChange={onSdmodelChange}
        onSelectFile={onSelectSdmodelFile}
        showSearchHF
      />

      <ModelField
        label="T5-XXL File"
        value={sdt5xxl}
        placeholder="Select a T5-XXL file or enter a direct URL"
        onChange={onSdt5xxlChange}
        onSelectFile={onSelectSdt5xxlFile}
      />

      <ModelField
        label="Clip-L File"
        value={sdclipl}
        placeholder="Select a Clip-L file or enter a direct URL"
        onChange={onSdcliplChange}
        onSelectFile={onSelectSdcliplFile}
      />

      <ModelField
        label="Clip-G File"
        value={sdclipg}
        placeholder="Select a Clip-G file or enter a direct URL"
        onChange={onSdclipgChange}
        onSelectFile={onSelectSdclipgFile}
      />

      <ModelField
        label="PhotoMaker"
        value={sdphotomaker}
        placeholder="Select a PhotoMaker file or enter a direct URL"
        tooltip="PhotoMaker is a model that allows face cloning. Select a .safetensors PhotoMaker file to be loaded (SDXL only)."
        onChange={onSdphotomakerChange}
        onSelectFile={onSelectSdphotomakerFile}
      />

      <ModelField
        label="Image VAE"
        value={sdvae}
        placeholder="Select a VAE file or enter a direct URL"
        onChange={onSdvaeChange}
        onSelectFile={onSelectSdvaeFile}
      />
    </Stack>
  );
};
