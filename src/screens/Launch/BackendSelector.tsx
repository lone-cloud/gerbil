import { Text, Group, Select, Badge, ActionIcon, Tooltip } from '@mantine/core';
import { useState, useEffect } from 'react';
import { AlertTriangle, Info } from 'lucide-react';
import { InfoTooltip } from '@/components/InfoTooltip';

interface BackendSelectorProps {
  backend: string;
  onBackendChange: (backend: string) => void;
  gpuDevice?: number;
  onGpuDeviceChange?: (device: number) => void;
  noavx2?: boolean;
  failsafe?: boolean;
}

export const BackendSelector = ({
  backend,
  onBackendChange,
  gpuDevice = 0,
  onGpuDeviceChange,
  noavx2 = false,
  failsafe = false,
}: BackendSelectorProps) => {
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

        let backends: Array<{
          value: string;
          label: string;
          devices?: string[];
        }> = [];

        if (currentBinaryInfo?.path) {
          backends = await window.electronAPI.kobold.getAvailableBackends(
            currentBinaryInfo.path,
            gpuCapabilities
          );

          const cpuBackend = backends.find((b) => b.value === 'cpu');
          if (cpuBackend) {
            cpuBackend.devices = cpuCapabilitiesResult.devices;
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
        window.electronAPI.logs.logError(
          'Failed to detect available backends:',
          error as Error
        );
        setAvailableBackends([]);
      } finally {
        setIsLoadingBackends(false);
      }
    };

    void detectAvailableBackends();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backend]);

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

    if (
      availableBackends.length > 0 &&
      availableBackends.some((b) => b.value === 'cpu')
    ) {
      warnings.push({
        type: 'info',
        message:
          "Performance Note: LLMs run significantly faster on GPU-accelerated systems. Consider using NVIDIA's CUDA or AMD's ROCm backends for optimal performance.",
      });
    }

    return warnings;
  };

  return (
    <div style={{ minHeight: '120px' }}>
      <Group gap="xs" align="center" mb="xs">
        <Text size="sm" fw={500}>
          Backend
        </Text>
        <InfoTooltip label="Select a backend to use. CUDA runs on Nvidia GPUs, and is much faster. ROCm is the AMD equivalent. Vulkan and CLBlast works on all GPUs but are somewhat slower." />
        {!isLoadingBackends &&
          availableBackends.length > 0 &&
          getWarnings().map((warning, index) => (
            <Tooltip
              key={index}
              label={warning.message}
              multiline
              w={300}
              withArrow
            >
              <ActionIcon
                size="sm"
                color={warning.type === 'warning' ? 'orange' : 'blue'}
                variant="light"
              >
                {warning.type === 'warning' ? (
                  <AlertTriangle size={14} />
                ) : (
                  <Info size={14} />
                )}
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
        onChange={(value) => {
          if (value) {
            onBackendChange(value);
          }
        }}
        data={availableBackends.map((b) => ({
          value: b.value,
          label: b.label,
        }))}
        disabled={isLoadingBackends || availableBackends.length === 0}
        style={{ minHeight: '36px' }}
      />

      {!isLoadingBackends &&
        (backend === 'cuda' || backend === 'rocm') &&
        onGpuDeviceChange &&
        availableBackends.find((b) => b.value === backend)?.devices &&
        availableBackends.find((b) => b.value === backend)!.devices!.length >
          1 && (
          <Select
            label="GPU Device"
            placeholder="Select GPU device"
            value={gpuDevice.toString()}
            onChange={(value) =>
              value && onGpuDeviceChange(parseInt(value, 10))
            }
            data={availableBackends
              .find((b) => b.value === backend)!
              .devices!.map((device, index) => ({
                value: index.toString(),
                label: `GPU ${index}: ${device}`,
              }))}
            mt="xs"
          />
        )}

      {!isLoadingBackends &&
        backend &&
        availableBackends.find((b) => b.value === backend)?.devices && (
          <Group gap="xs" mt="xs">
            <Text size="xs" c="dimmed">
              {availableBackends.find((b) => b.value === backend)?.devices
                ?.length === 1
                ? 'Device:'
                : 'Devices:'}
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
    </div>
  );
};
