import { useEffect, useState } from 'react';
import { Badge, Group, Tooltip, useComputedColorScheme } from '@mantine/core';
import type {
  CpuMetrics,
  MemoryMetrics,
  GpuMetrics,
} from '@/main/modules/monitoring';

interface StatusBarProps {
  maxDataPoints?: number;
}

export const StatusBar = ({ maxDataPoints = 60 }: StatusBarProps) => {
  const [cpuMetrics, setCpuMetrics] = useState<CpuMetrics | null>(null);
  const [memoryMetrics, setMemoryMetrics] = useState<MemoryMetrics | null>(
    null
  );
  const [gpuMetrics, setGpuMetrics] = useState<GpuMetrics | null>(null);
  const colorScheme = useComputedColorScheme('light', {
    getInitialValueInEffect: true,
  });

  useEffect(() => {
    let isMounted = true;

    const handleCpuMetrics = async (metrics: CpuMetrics) => {
      if (!isMounted) return;
      setCpuMetrics(metrics);
    };

    const handleMemoryMetrics = async (metrics: MemoryMetrics) => {
      if (!isMounted) return;
      setMemoryMetrics(metrics);
    };

    const handleGpuMetrics = async (metrics: GpuMetrics) => {
      if (!isMounted) return;
      setGpuMetrics(metrics);
    };

    window.electronAPI.monitoring.onCpuMetrics(handleCpuMetrics);
    window.electronAPI.monitoring.onMemoryMetrics(handleMemoryMetrics);
    window.electronAPI.monitoring.onGpuMetrics(handleGpuMetrics);
    void window.electronAPI.monitoring.start();

    return () => {
      isMounted = false;
      window.electronAPI.monitoring.removeCpuMetricsListener();
      window.electronAPI.monitoring.removeMemoryMetricsListener();
      window.electronAPI.monitoring.removeGpuMetricsListener();
      window.electronAPI.monitoring.stop();
    };
  }, [maxDataPoints]);

  return (
    <Group
      px="xs"
      gap="xs"
      justify="flex-end"
      style={{
        backgroundColor:
          colorScheme === 'dark'
            ? 'var(--mantine-color-dark-8)'
            : 'var(--mantine-color-gray-1)',
      }}
    >
      {cpuMetrics && memoryMetrics && (
        <>
          <Tooltip label={`${cpuMetrics.usage.toFixed(1)}%`} position="top">
            <Badge
              size="sm"
              variant="light"
              style={{ minWidth: '5rem', textAlign: 'center' }}
            >
              CPU: {cpuMetrics.usage.toFixed(1)}%
            </Badge>
          </Tooltip>

          <Tooltip
            label={`${memoryMetrics.used.toFixed(1)} GB / ${memoryMetrics.total.toFixed(1)} GB (${memoryMetrics.usage.toFixed(1)}%)`}
            position="top"
          >
            <Badge
              size="sm"
              variant="light"
              style={{ minWidth: '5rem', textAlign: 'center' }}
            >
              RAM: {memoryMetrics.usage.toFixed(1)}%
            </Badge>
          </Tooltip>
        </>
      )}

      {gpuMetrics?.gpus.map((gpu, index) => (
        <Group gap="xs" key={`gpu-${index}`}>
          <Tooltip label={`${gpu.usage.toFixed(1)}%`} position="top">
            <Badge
              size="sm"
              variant="light"
              style={{ minWidth: '5rem', textAlign: 'center' }}
            >
              GPU: {gpu.usage.toFixed(1)}%
            </Badge>
          </Tooltip>

          <Tooltip
            label={`${gpu.memoryUsed.toFixed(1)} GB / ${gpu.memoryTotal.toFixed(1)} GB (${gpu.memoryUsage.toFixed(1)}%)`}
            position="top"
          >
            <Badge
              size="sm"
              variant="light"
              style={{ minWidth: '5rem', textAlign: 'center' }}
            >
              VRAM: {gpu.memoryUsage.toFixed(1)}%
            </Badge>
          </Tooltip>
        </Group>
      ))}
    </Group>
  );
};
