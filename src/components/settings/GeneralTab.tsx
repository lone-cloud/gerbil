import { useState, useEffect } from 'react';
import { Stack, Text, Switch } from '@mantine/core';
import { usePreferencesStore } from '@/stores/preferences';

export const GeneralTab = () => {
  const [enableSystemTray, setEnableSystemTray] = useState(false);
  const { systemMonitoringEnabled, setSystemMonitoringEnabled } =
    usePreferencesStore();

  useEffect(() => {
    loadSystemTrayPreference();
  }, []);

  const loadSystemTrayPreference = async () => {
    const enabled = await window.electronAPI.app.getEnableSystemTray();
    setEnableSystemTray(enabled);
  };

  const handleSystemTrayToggle = async (checked: boolean) => {
    setEnableSystemTray(checked);
    await window.electronAPI.app.setEnableSystemTray(checked);
  };

  return (
    <Stack gap="lg" h="100%">
      <div>
        <Text fw={500} mb="sm">
          Status Bar
        </Text>
        <Text size="sm" c="dimmed" mb="md">
          Control what information is displayed in the status bar
        </Text>
        <Switch
          label="Show system metrics"
          checked={systemMonitoringEnabled}
          onChange={(event) =>
            setSystemMonitoringEnabled(event.currentTarget.checked)
          }
        />
      </div>

      <div>
        <Text fw={500} mb="sm">
          System Tray
        </Text>
        <Text size="sm" c="dimmed" mb="md">
          Add a system tray icon with quick access to launch, eject, and monitor
          system metrics
        </Text>
        <Switch
          label="Enable system tray icon"
          checked={enableSystemTray}
          onChange={(event) =>
            handleSystemTrayToggle(event.currentTarget.checked)
          }
        />
      </div>
    </Stack>
  );
};
