import { Stack, Text, Group, TextInput, Button, Slider } from '@mantine/core';
import { File, Search } from 'lucide-react';
import { InfoTooltip } from '@/components/InfoTooltip';
import { BackendSelector } from '@/components/screens/Launch/GeneralTab/BackendSelector';
import { getInputValidationState } from '@/utils';
import styles from '@/styles/layout.module.css';

interface GeneralTabProps {
  modelPath: string;
  gpuLayers: number;
  autoGpuLayers: boolean;
  contextSize: number;
  backend: string;
  gpuDevice?: number;
  noavx2: boolean;
  failsafe: boolean;
  onModelPathChange: (path: string) => void;
  onSelectModelFile: () => void;
  onGpuLayersChange: (layers: number) => void;
  onAutoGpuLayersChange: (auto: boolean) => void;
  onContextSizeChange: (size: number) => void;
  onBackendChange: (backend: string) => void;
  onGpuDeviceChange?: (device: number) => void;
  onWarningsChange?: (
    warnings: Array<{ type: 'warning' | 'info'; message: string }>
  ) => void;
  onBackendsReady?: () => void;
}

export const GeneralTab = ({
  modelPath,
  gpuLayers,
  autoGpuLayers,
  contextSize,
  backend,
  gpuDevice,
  noavx2,
  failsafe,
  onModelPathChange,
  onSelectModelFile,
  onGpuLayersChange,
  onAutoGpuLayersChange,
  onContextSizeChange,
  onBackendChange,
  onGpuDeviceChange,
  onWarningsChange,
  onBackendsReady,
}: GeneralTabProps) => {
  const validationState = getInputValidationState(modelPath);

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
    if (!modelPath.trim()) return undefined;

    if (validationState === 'invalid') {
      return 'Enter a valid URL or file path to the .gguf';
    }

    return undefined;
  };

  return (
    <Stack gap="md">
      <BackendSelector
        backend={backend}
        onBackendChange={onBackendChange}
        gpuDevice={gpuDevice}
        onGpuDeviceChange={onGpuDeviceChange}
        noavx2={noavx2}
        failsafe={failsafe}
        onWarningsChange={onWarningsChange}
        onBackendsReady={onBackendsReady}
        gpuLayers={gpuLayers}
        autoGpuLayers={autoGpuLayers}
        onGpuLayersChange={onGpuLayersChange}
        onAutoGpuLayersChange={onAutoGpuLayersChange}
      />

      <div>
        <Text size="sm" fw={500} mb="xs">
          Text Model File
        </Text>
        <Group gap="xs" align="flex-start">
          <div className={styles.flex1}>
            <TextInput
              placeholder="Select a .gguf model file or enter a direct URL to file"
              value={modelPath}
              onChange={(event) => onModelPathChange(event.currentTarget.value)}
              color={getInputColor()}
              error={
                validationState === 'invalid' ? getHelperText() : undefined
              }
            />
          </div>
          <Button
            onClick={onSelectModelFile}
            variant="light"
            leftSection={<File size={16} />}
          >
            Browse
          </Button>
          <Button
            onClick={() => {
              window.electronAPI.app.openExternal(
                'https://huggingface.co/models?pipeline_tag=text-generation&library=gguf&sort=trending'
              );
            }}
            variant="outline"
            leftSection={<Search size={16} />}
          >
            Search HF
          </Button>
        </Group>
      </div>

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
              onContextSizeChange(Number(event.target.value) || 256)
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
          onChange={onContextSizeChange}
        />
      </div>
    </Stack>
  );
};
