import {
  Stack,
  Text,
  Group,
  TextInput,
  Button,
  Checkbox,
  Slider,
} from '@mantine/core';
import { File, Search } from 'lucide-react';
import { InfoTooltip } from '@/components/InfoTooltip';
import { BackendSelector } from '@/screens/Launch/BackendSelector';
import { getInputValidationState } from '@/utils/validation';

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
    <Stack gap="lg">
      <BackendSelector
        backend={backend}
        onBackendChange={onBackendChange}
        gpuDevice={gpuDevice}
        onGpuDeviceChange={onGpuDeviceChange}
        noavx2={noavx2}
        failsafe={failsafe}
        onWarningsChange={onWarningsChange}
        onBackendsReady={onBackendsReady}
      />

      <div>
        <Text size="sm" fw={500} mb="xs">
          Text Model File
        </Text>
        <Group gap="xs" align="flex-start">
          <div style={{ flex: 1 }}>
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
              GPU Layers
            </Text>
            <InfoTooltip label="The number of layer's to offload to your GPU's VRAM. Ideally the entire LLM should fit inside the VRAM for optimal performance." />
          </Group>
          <Group gap="lg" align="center">
            <Group gap="xs" align="center">
              <Checkbox
                label="Auto"
                checked={autoGpuLayers}
                onChange={(event) =>
                  onAutoGpuLayersChange(event.currentTarget.checked)
                }
                size="sm"
              />
              <InfoTooltip label="Automatically try to allocate the GPU layers based on available VRAM." />
            </Group>
            <TextInput
              value={gpuLayers.toString()}
              onChange={(event) =>
                onGpuLayersChange(Number(event.target.value) || 0)
              }
              type="number"
              min={0}
              max={100}
              step={1}
              size="sm"
              w={80}
              disabled={autoGpuLayers}
            />
          </Group>
        </Group>
        <Slider
          value={gpuLayers}
          min={0}
          max={100}
          step={1}
          onChange={onGpuLayersChange}
          disabled={autoGpuLayers}
        />
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
