import { useEffect, useState } from 'react';
import {
  Box,
  Flex,
  ActionIcon,
  Tooltip,
  Badge,
  Group,
  useMantineTheme,
  useComputedColorScheme,
} from '@mantine/core';
import { Settings } from 'lucide-react';
import { SettingsModal } from '@/components/settings/SettingsModal';
import { safeExecute } from '@/utils/logger';
import type { FrontendPreference, Screen } from '@/types';
import type {
  CpuMetrics,
  MemoryMetrics,
  GpuMetrics,
} from '@/main/modules/monitoring';

interface StatusBarProps {
  maxDataPoints?: number;
  currentScreen: Screen | null;
  frontendPreference: FrontendPreference;
  onFrontendPreferenceChange: (preference: FrontendPreference) => void;
}

export const StatusBar = ({
  maxDataPoints = 60,
  currentScreen,
  frontendPreference: _frontendPreference,
  onFrontendPreferenceChange,
}: StatusBarProps) => {
  const [cpuMetrics, setCpuMetrics] = useState<CpuMetrics | null>(null);
  const [memoryMetrics, setMemoryMetrics] = useState<MemoryMetrics | null>(
    null
  );
  const [gpuMetrics, setGpuMetrics] = useState<GpuMetrics | null>(null);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const theme = useMantineTheme();
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

  if (!cpuMetrics || !memoryMetrics) {
    return null;
  }

  return (
    <Box
      px="xs"
      style={{
        borderTop: `1px solid ${colorScheme === 'dark' ? theme.colors.dark[4] : theme.colors.gray[3]}`,
        backgroundColor:
          colorScheme === 'dark'
            ? 'var(--mantine-color-dark-8)'
            : 'var(--mantine-color-gray-1)',
      }}
    >
      <Flex align="center" justify="space-between">
        <Group gap="xs" wrap="nowrap">
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
            label={`${(memoryMetrics.used / 1024 ** 3).toFixed(1)} GB / ${(memoryMetrics.total / 1024 ** 3).toFixed(1)} GB (${memoryMetrics.usage.toFixed(1)}%)`}
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

          {gpuMetrics?.gpus.map((gpu, index) => (
            <Group key={`gpu-${index}`} gap={4} wrap="nowrap">
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
                label={`${(gpu.memoryUsed / 1024).toFixed(1)} GB / ${(gpu.memoryTotal / 1024).toFixed(1)} GB (${gpu.memoryUsage.toFixed(1)}%)`}
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

        <Tooltip label="Settings" position="top">
          <ActionIcon
            variant="subtle"
            size="sm"
            onClick={() => setSettingsModalOpen(true)}
            aria-label="Open settings"
            style={{
              borderRadius: '0.25rem',
            }}
          >
            <Settings size="1rem" />
          </ActionIcon>
        </Tooltip>
      </Flex>

      <SettingsModal
        isOnInterfaceScreen={currentScreen === 'interface'}
        opened={settingsModalOpen}
        onClose={async () => {
          setSettingsModalOpen(false);
          const preference = await safeExecute(
            () =>
              window.electronAPI.config.get(
                'frontendPreference'
              ) as Promise<FrontendPreference>,
            'Failed to load frontend preference:'
          );
          onFrontendPreferenceChange(preference || 'koboldcpp');
        }}
        currentScreen={currentScreen || undefined}
      />
    </Box>
  );
};
