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
import type { SystemMetrics } from '@/main/modules/monitoring';

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
  const [currentMetrics, setCurrentMetrics] = useState<SystemMetrics | null>(
    null
  );
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const theme = useMantineTheme();
  const colorScheme = useComputedColorScheme('light', {
    getInitialValueInEffect: true,
  });

  useEffect(() => {
    let isMounted = true;

    const handleMetrics = async (newMetrics: SystemMetrics) => {
      if (!isMounted) return;

      setCurrentMetrics(newMetrics);
    };

    window.electronAPI.monitoring.onMetrics(handleMetrics);
    void window.electronAPI.monitoring.start();

    return () => {
      isMounted = false;
      window.electronAPI.monitoring.removeMetricsListener();
      window.electronAPI.monitoring.stop();
    };
  }, [maxDataPoints]);

  if (!currentMetrics) {
    return null;
  }

  return (
    <Box
      pr="xs"
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
          <Tooltip
            label={`${currentMetrics.cpu.usage.toFixed(1)}%`}
            position="top"
          >
            <Badge size="sm" variant="light">
              CPU: {currentMetrics.cpu.usage.toFixed(1)}%
            </Badge>
          </Tooltip>

          <Tooltip
            label={`${(currentMetrics.memory.used / 1024 ** 3).toFixed(1)} GB / ${(currentMetrics.memory.total / 1024 ** 3).toFixed(1)} GB (${currentMetrics.memory.usage.toFixed(1)}%)`}
            position="top"
          >
            <Badge size="sm" variant="light">
              RAM: {currentMetrics.memory.usage.toFixed(1)}%
            </Badge>
          </Tooltip>

          {currentMetrics.gpu?.map((gpu, index) => (
            <Group key={`gpu-${index}`} gap={4} wrap="nowrap">
              <Tooltip label={`${gpu.usage.toFixed(1)}%`} position="top">
                <Badge size="sm" variant="light">
                  GPU: {gpu.usage.toFixed(1)}%
                </Badge>
              </Tooltip>

              <Tooltip
                label={`${(gpu.memoryUsed / 1024 ** 2).toFixed(1)} MB / ${(gpu.memoryTotal / 1024 ** 2).toFixed(1)} MB (${gpu.memoryUsage.toFixed(1)}%)`}
                position="top"
              >
                <Badge size="sm" variant="light">
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
