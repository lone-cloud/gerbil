import {
  Text,
  Group,
  Select,
  Badge,
  Card,
  useMantineColorScheme,
  ActionIcon,
  Tooltip,
} from '@mantine/core';
import { useState, useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { InfoTooltip } from '@/components/InfoTooltip';
import { isNoCudaBinary, isRocmBinary } from '@/utils/binaryUtils';

interface BackendSelectorProps {
  backend: string;
  onBackendChange: (backend: string) => void;
  noavx2?: boolean;
  failsafe?: boolean;
}

export const BackendSelector = ({
  backend,
  onBackendChange,
  noavx2 = false,
  failsafe = false,
}: BackendSelectorProps) => {
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === 'dark';

  const [availableBackends, setAvailableBackends] = useState<
    Array<{ value: string; label: string; devices?: string[] }>
  >([]);
  const [isLoadingBackends, setIsLoadingBackends] = useState(true);
  const [cpuCapabilities, setCpuCapabilities] = useState<{
    avx: boolean;
    avx2: boolean;
  } | null>(null);

  useEffect(() => {
    const detectAvailableBackends = async () => {
      setIsLoadingBackends(true);

      try {
        const [currentBinaryInfo, cpuCapabilitiesResult, gpuCapabilities] =
          await Promise.all([
            window.electronAPI.kobold.getCurrentBinaryInfo(),
            window.electronAPI.kobold.detectCPU(),
            window.electronAPI.kobold.detectGPUCapabilities(),
          ]);

        setCpuCapabilities({
          avx: cpuCapabilitiesResult.avx,
          avx2: cpuCapabilitiesResult.avx2,
        });

        const backends: Array<{
          value: string;
          label: string;
          devices?: string[];
        }> = [];

        if (currentBinaryInfo?.filename) {
          const filename = currentBinaryInfo.filename;

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

          backends.push({
            value: 'cpu',
            label: 'CPU',
            devices: cpuCapabilitiesResult.cpuInfo,
          });
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

  const getWarnings = () => {
    if (backend !== 'cpu' || !cpuCapabilities) return [];

    const warnings = [];

    if (!cpuCapabilities.avx2 && !noavx2) {
      warnings.push({
        type: 'warning',
        message:
          'Your CPU does not support AVX2. Enable the "Disable AVX2" option to avoid crashes.',
      });
    }

    if (!cpuCapabilities.avx && !cpuCapabilities.avx2 && !failsafe) {
      warnings.push({
        type: 'warning',
        message:
          'Your CPU does not support AVX or AVX2. Enable the "Failsafe" option to avoid crashes.',
      });
    }

    return warnings;
  };

  return (
    <div>
      <Group gap="xs" align="center" mb="xs">
        <Text size="sm" fw={500}>
          Backend
        </Text>
        <InfoTooltip label="Select a backend to use. CUDA runs on Nvidia GPUs, and is much faster. ROCm is the AMD equivalent. Vulkan and CLBlast works on all GPUs but are somewhat slower." />
        {getWarnings().map((warning, index) => (
          <Tooltip
            key={index}
            label={warning.message}
            multiline
            w={300}
            withArrow
          >
            <ActionIcon size="sm" color="orange" variant="light">
              <AlertTriangle size={14} />
            </ActionIcon>
          </Tooltip>
        ))}
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
  );
};
