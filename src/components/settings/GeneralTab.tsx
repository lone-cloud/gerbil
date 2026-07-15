import { Stack, Text } from '@mantine/core';
import { useEffect, useState } from 'react';

import { Switch } from '@/components/Switch';
import { usePreferencesStore } from '@/stores/preferences';

export const GeneralTab = () => {
  const [enableSystemTray, setEnableSystemTray] = useState(false);
  const [startMinimizedToTray, setStartMinimizedToTray] = useState(false);
  const { ignoreIGPUs, setIgnoreIGPUs, systemMonitoringEnabled, setSystemMonitoringEnabled } =
    usePreferencesStore();

  useEffect(() => {
    const loadSystemTrayPreference = async () => {
      const [trayEnabled, startMinimized] = await Promise.all([
        window.electronAPI.app.getEnableSystemTray(),
        window.electronAPI.app.getStartMinimizedToTray(),
      ]);
      setEnableSystemTray(trayEnabled);
      setStartMinimizedToTray(startMinimized);
    };

    void loadSystemTrayPreference();
  }, []);

  const handleSystemTrayToggle = async (checked: boolean) => {
    setEnableSystemTray(checked);
    await window.electronAPI.app.setEnableSystemTray(checked);
    if (!checked) {
      setStartMinimizedToTray(false);
      await window.electronAPI.app.setStartMinimizedToTray(false);
    }
  };

  const handleStartMinimizedToggle = async (checked: boolean) => {
    setStartMinimizedToTray(checked);
    await window.electronAPI.app.setStartMinimizedToTray(checked);
  };

  return (
    <Stack gap="lg" h="100%">
      <div>
        <Text fw={500} mb="xs">
          Monitoring
        </Text>
        <Text size="sm" c="dimmed" mb="md">
          Control which system metrics are collected and displayed throughout the app
        </Text>
        <Switch
          label="Show system metrics"
          description="Display CPU, RAM, and GPU usage in the status bar"
          checked={systemMonitoringEnabled}
          onChange={(event) => setSystemMonitoringEnabled(event.currentTarget.checked)}
        />
        <Switch
          checked={ignoreIGPUs}
          label="Ignore integrated GPUs"
          description="Hides integrated GPUs from acceleration options, device lists, and hardware display"
          mt="sm"
          onChange={(event) => setIgnoreIGPUs(event.currentTarget.checked)}
        />
      </div>

      <div>
        <Text fw={500} mb="xs">
          System Tray
        </Text>
        <Text size="sm" c="dimmed" mb="md">
          Add a system tray icon with quick access to launch, eject and monitor system metrics
        </Text>
        <Switch
          label="Enable system tray icon"
          checked={enableSystemTray}
          onChange={(event) => void handleSystemTrayToggle(event.currentTarget.checked)}
        />
      </div>

      <div>
        <Text fw={500} mb="xs">
          Startup
        </Text>
        <Text size="sm" c="dimmed" mb="md">
          Control how the application behaves when launched
        </Text>
        <Switch
          label="Start minimized to tray"
          checked={startMinimizedToTray}
          disabled={!enableSystemTray}
          onChange={(event) => void handleStartMinimizedToggle(event.currentTarget.checked)}
        />
      </div>
    </Stack>
  );
};
