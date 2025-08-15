import {
  Stack,
  Text,
  Group,
  TextInput,
  Button,
  Checkbox,
  Slider,
  Select,
  Badge,
  Card,
  useMantineColorScheme,
} from '@mantine/core';
import { useState, useEffect } from 'react';
import { File, Search } from 'lucide-react';
import { InfoTooltip } from '@/components/InfoTooltip';
import { getInputValidationState } from '@/utils/validation';
import { isNoCudaBinary, isRocmBinary } from '@/utils/binaryUtils';

interface GeneralTabProps {
  modelPath: string;
  gpuLayers: number;
  autoGpuLayers: boolean;
  contextSize: number;
  backend: string;
  onModelPathChange: (path: string) => void;
  onSelectModelFile: () => void;
  onGpuLayersChange: (layers: number) => void;
  onAutoGpuLayersChange: (auto: boolean) => void;
  onContextSizeChange: (size: number) => void;
  onBackendChange: (backend: string) => void;
}

export const GeneralTab = ({
  modelPath,
  gpuLayers,
  autoGpuLayers,
  contextSize,
  backend,
  onModelPathChange,
  onSelectModelFile,
  onGpuLayersChange,
  onAutoGpuLayersChange,
  onContextSizeChange,
  onBackendChange,
}: GeneralTabProps) => {
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === 'dark';

  const [availableBackends, setAvailableBackends] = useState<
    Array<{ value: string; label: string; devices?: string[] }>
  >([]);
  const [isLoadingBackends, setIsLoadingBackends] = useState(true);

  useEffect(() => {
    const detectAvailableBackends = async () => {
      setIsLoadingBackends(true);

      try {
        const [currentBinaryInfo, _cpuCapabilities, gpuCapabilities] =
          await Promise.all([
            window.electronAPI.kobold.getCurrentBinaryInfo(),
            window.electronAPI.kobold.detectCPU(),
            window.electronAPI.kobold.detectGPUCapabilities(),
          ]);

        const backends: Array<{
          value: string;
          label: string;
          devices?: string[];
        }> = [];

        if (currentBinaryInfo?.filename) {
          const filename = currentBinaryInfo.filename;

          backends.push({ value: 'cpu', label: 'CPU' });

          if (!isNoCudaBinary(filename) && gpuCapabilities.cuda.supported) {
            backends.push({
              value: 'cuda',
              label: 'CUDA',
              devices: gpuCapabilities.cuda.devices,
            });
          }

          if (isRocmBinary(filename) && gpuCapabilities.rocm.supported) {
            backends.push({
              value: 'rocm',
              label: 'ROCm',
              devices: gpuCapabilities.rocm.devices,
            });
          }

          if (gpuCapabilities.vulkan.supported) {
            backends.push({
              value: 'vulkan',
              label: 'Vulkan',
              devices: gpuCapabilities.vulkan.devices,
            });
          }

          if (gpuCapabilities.clblast.supported) {
            backends.push({
              value: 'clblast',
              label: 'CLBlast',
              devices: gpuCapabilities.clblast.devices,
            });
          }
        }

        setAvailableBackends(backends);

        if (
          backends.length > 0 &&
          (!backend || !backends.some((b) => b.value === backend))
        ) {
          onBackendChange(backends[0].value);
        }
      } catch (error) {
        console.warn('Failed to detect available backends:', error);
        setAvailableBackends([]);
      } finally {
        setIsLoadingBackends(false);
      }
    };

    void detectAvailableBackends();
  }, [backend, onBackendChange]);

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
      <div>
        <Text size="sm" fw={500} mb="xs">
          Text Model File *
        </Text>
        <Group gap="xs" align="flex-start">
          <div style={{ flex: 1 }}>
            <TextInput
              placeholder="Select a .gguf model file or enter a direct URL to file"
              value={modelPath}
              onChange={(event) => onModelPathChange(event.currentTarget.value)}
              required
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
        <Group gap="xs" align="center" mb="xs">
          <Text size="sm" fw={500}>
            Backend
          </Text>
          <InfoTooltip label="Select a backend to use. CUDA runs on Nvidia GPUs, and is much faster. ROCm is the AMD equivalent. Vulkan and CLBlast works on all GPUs but are somewhat slower." />
        </Group>
        <Select
          placeholder={
            isLoadingBackends
              ? 'Detecting available backends...'
              : 'Select backend'
          }
          value={backend}
          onChange={(value) => value && onBackendChange(value)}
          data={availableBackends.map((b) => ({
            value: b.value,
            label: b.label,
          }))}
          disabled={isLoadingBackends || availableBackends.length === 0}
        />
        {backend &&
          availableBackends.find((b) => b.value === backend)?.devices && (
            <Group gap="xs" mt="xs">
              <Text size="xs" c="dimmed">
                Devices:
              </Text>
              {availableBackends
                .find((b) => b.value === backend)
                ?.devices?.map((device, index) => (
                  <Badge key={index} variant="light" size="sm">
                    {device}
                  </Badge>
                ))}
            </Group>
          )}
        {backend === 'cpu' && (
          <Card withBorder p="sm" mt="xs" bg={isDark ? 'blue.9' : 'blue.0'}>
            <Text size="sm" c={isDark ? 'blue.2' : 'blue.8'}>
              <Text component="span" fw={600}>
                Performance Note:
              </Text>{' '}
              LLMs run significantly faster on GPU-accelerated systems. Consider
              using NVIDIA&apos;s CUDA or AMD&apos;s ROCm backends for optimal
              performance.
            </Text>
          </Card>
        )}
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
