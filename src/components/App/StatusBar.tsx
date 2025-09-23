import { useEffect, useState } from 'react';
import { Group, AppShell, ActionIcon, Tooltip } from '@mantine/core';
import { NotepadText } from 'lucide-react';
import { usePreferencesStore } from '@/stores/preferences';
import { useNotepadStore } from '@/stores/notepad';
import type {
  CpuMetrics,
  MemoryMetrics,
  GpuMetrics,
} from '@/main/modules/monitoring';
import { PerformanceBadge } from './PerformanceBadge';

interface StatusBarProps {
  maxDataPoints?: number;
}

export const StatusBar = ({ maxDataPoints = 60 }: StatusBarProps) => {
  const [cpuMetrics, setCpuMetrics] = useState<CpuMetrics | null>(null);
  const [memoryMetrics, setMemoryMetrics] = useState<MemoryMetrics | null>(
    null
  );
  const [gpuMetrics, setGpuMetrics] = useState<GpuMetrics | null>(null);
  const { resolvedColorScheme: colorScheme } = usePreferencesStore();
  const { isVisible, setVisible } = useNotepadStore();

  useEffect(() => {
    let isMounted = true;

    const handleCpuMetrics = (metrics: CpuMetrics) => {
      if (!isMounted) return;
      setCpuMetrics(metrics);
    };

    const handleMemoryMetrics = (metrics: MemoryMetrics) => {
      if (!isMounted) return;
      setMemoryMetrics(metrics);
    };

    const handleGpuMetrics = (metrics: GpuMetrics) => {
      if (!isMounted) return;
      setGpuMetrics(metrics);
    };

    const cleanupCpu =
      window.electronAPI.monitoring.onCpuMetrics(handleCpuMetrics);
    const cleanupMemory =
      window.electronAPI.monitoring.onMemoryMetrics(handleMemoryMetrics);
    const cleanupGpu =
      window.electronAPI.monitoring.onGpuMetrics(handleGpuMetrics);
    const stopMonitoring = window.electronAPI.monitoring.start();

    return () => {
      isMounted = false;
      cleanupCpu();
      cleanupMemory();
      cleanupGpu();
      stopMonitoring();
    };
  }, [maxDataPoints]);

  return (
    <AppShell.Footer
      style={{
        border: '1px solid var(--mantine-color-default-border)',
      }}
    >
      <Group
        px="xs"
        gap="xs"
        justify="space-between"
        h="100%"
        bg={colorScheme === 'dark' ? 'dark.6' : 'gray.1'}
      >
        <Group gap="xs">
          <Tooltip label="Notepad" disabled={isVisible}>
            <ActionIcon
              variant={isVisible ? 'filled' : 'subtle'}
              size="sm"
              onClick={() => setVisible(!isVisible)}
            >
              <NotepadText size="1.25rem" />
            </ActionIcon>
          </Tooltip>
        </Group>

        <Group gap="xs">
          {cpuMetrics && memoryMetrics && (
            <>
              <PerformanceBadge
                label="CPU"
                value={`${cpuMetrics.usage}%`}
                tooltipLabel={`${cpuMetrics.usage}%${cpuMetrics.temperature ? ` • ${cpuMetrics.temperature}°C` : ''}`}
              />

              <PerformanceBadge
                label="RAM"
                value={`${memoryMetrics.usage}%`}
                tooltipLabel={`${memoryMetrics.used.toFixed(2)} GB / ${memoryMetrics.total.toFixed(2)} GB (${memoryMetrics.usage}%)`}
              />
            </>
          )}

          {gpuMetrics?.gpus.map((gpu, index) => (
            <Group gap="xs" key={`gpu-${index}`}>
              <PerformanceBadge
                label={`GPU${gpuMetrics.gpus.length > 1 ? ` ${index + 1}` : ''}`}
                value={`${gpu.usage}%`}
                tooltipLabel={`${gpu.usage}%${gpu.temperature ? ` • ${gpu.temperature}°C` : ''}`}
              />

              <PerformanceBadge
                label={`VRAM${gpuMetrics.gpus.length > 1 ? ` ${index + 1}` : ''}`}
                value={`${gpu.memoryUsage}%`}
                tooltipLabel={`${gpu.memoryUsed.toFixed(2)} GB / ${gpu.memoryTotal.toFixed(2)} GB (${gpu.memoryUsage}%)`}
              />
            </Group>
          ))}
        </Group>
      </Group>
    </AppShell.Footer>
  );
};
