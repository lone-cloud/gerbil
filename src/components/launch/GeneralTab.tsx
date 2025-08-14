import {
  Stack,
  Text,
  Group,
  TextInput,
  Button,
  ActionIcon,
  Tooltip,
  Checkbox,
  Slider,
} from '@mantine/core';
import { File, Info, Search } from 'lucide-react';

interface GeneralTabProps {
  modelPath: string;
  gpuLayers: number;
  autoGpuLayers: boolean;
  contextSize: number;
  onModelPathChange: (path: string) => void;
  onSelectModelFile: () => void;
  onGpuLayersChange: (layers: number) => void;
  onAutoGpuLayersChange: (auto: boolean) => void;
  onContextSizeChange: (size: number) => void;
}

export const GeneralTab = ({
  modelPath,
  gpuLayers,
  autoGpuLayers,
  contextSize,
  onModelPathChange,
  onSelectModelFile,
  onGpuLayersChange,
  onAutoGpuLayersChange,
  onContextSizeChange,
}: GeneralTabProps) => (
  <Stack gap="lg">
    <div>
      <Text size="sm" fw={500} mb="xs">
        Model File *
      </Text>
      <Group gap="xs">
        <TextInput
          placeholder="Select a .gguf model file"
          value={modelPath}
          onChange={(event) => onModelPathChange(event.currentTarget.value)}
          style={{ flex: 1 }}
          required
        />
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
          <Tooltip
            label="The number of layer's to offload to your GPU's VRAM. Ideally the entire LLM should fit inside the VRAM for optimal performance."
            multiline
            w={300}
            withArrow
            color="dark"
            styles={{
              tooltip: {
                backgroundColor: 'var(--mantine-color-dark-6)',
                color: 'var(--mantine-color-gray-0)',
                border: '1px solid var(--mantine-color-dark-4)',
              },
            }}
          >
            <ActionIcon variant="subtle" size="xs" color="gray">
              <Info size={14} />
            </ActionIcon>
          </Tooltip>
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
            <Tooltip
              label="Automatically try to allocate the GPU layers based on available VRAM."
              multiline
              w={300}
              withArrow
              color="dark"
              styles={{
                tooltip: {
                  backgroundColor: 'var(--mantine-color-dark-6)',
                  color: 'var(--mantine-color-gray-0)',
                  border: '1px solid var(--mantine-color-dark-4)',
                },
              }}
            >
              <ActionIcon variant="subtle" size="xs" color="gray">
                <Info size={14} />
              </ActionIcon>
            </Tooltip>
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
          <Tooltip
            label="Controls the memory allocated for maximum context size. The larger the context, the larger the required memory."
            multiline
            w={300}
            withArrow
            color="dark"
            styles={{
              tooltip: {
                backgroundColor: 'var(--mantine-color-dark-6)',
                color: 'var(--mantine-color-gray-0)',
                border: '1px solid var(--mantine-color-dark-4)',
              },
            }}
          >
            <ActionIcon variant="subtle" size="xs" color="gray">
              <Info size={14} />
            </ActionIcon>
          </Tooltip>
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
