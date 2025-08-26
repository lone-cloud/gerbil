import { Stack, Text, Group, TextInput, Slider } from '@mantine/core';
import { InfoTooltip } from '@/components/InfoTooltip';
import { BackendSelector } from '@/components/screens/Launch/GeneralTab/BackendSelector';
import { ModelFileField } from '@/components/ModelFileField';
import { useLaunchConfig } from '@/hooks/useLaunchConfig';

export const GeneralTab = () => {
  const {
    modelPath,
    contextSize,
    handleModelPathChange,
    handleSelectModelFile,
    handleContextSizeChangeWithStep,
  } = useLaunchConfig();

  return (
    <Stack gap="md">
      <BackendSelector />

      <ModelFileField
        label="Text Model File"
        value={modelPath}
        placeholder="Select a .gguf model file or enter a direct URL to file"
        tooltip="Select a GGUF text generation model file for chat and completion tasks."
        onChange={handleModelPathChange}
        onSelectFile={handleSelectModelFile}
        showSearchHF
        searchUrl="https://huggingface.co/models?pipeline_tag=text-generation&library=gguf&sort=trending"
      />

      <div>
        <Group justify="space-between" align="center" mb="xs">
          <Group gap="xs" align="center">
            <Text size="sm" fw={500}>
              Context Size
            </Text>
            <InfoTooltip label="Controls the memory allocated for maximum context size. The larger the context, the larger the required memory." />
          </Group>
          <TextInput
            value={contextSize?.toString() || ''}
            onChange={(event) =>
              handleContextSizeChangeWithStep(Number(event.target.value) || 256)
            }
            type="number"
            min={256}
            max={131072}
            step={256}
            size="sm"
            w={100}
          />
        </Group>
        <Slider
          value={contextSize}
          min={256}
          max={131072}
          step={1}
          onChange={handleContextSizeChangeWithStep}
        />
      </div>
    </Stack>
  );
};
