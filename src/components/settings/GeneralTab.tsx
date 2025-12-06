import { useState, useEffect } from 'react';
import { Stack, Text } from '@mantine/core';
import { usePreferencesStore } from '@/stores/preferences';
import { Switch } from '@/components/Switch';

export const GeneralTab = () => {
  const [enableSystemTray, setEnableSystemTray] = useState(false);
  const [startMinimizedToTray, setStartMinimizedToTray] = useState(false);
  const { systemMonitoringEnabled, setSystemMonitoringEnabled } =
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

    loadSystemTrayPreference();
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
        <Text fw={500} mb="xs">
          System Tray
        </Text>
        <Text size="sm" c="dimmed" mb="md">
          Add a system tray icon with quick access to launch, eject and monitor
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
          onChange={(event) =>
            handleStartMinimizedToggle(event.currentTarget.checked)
          }
        />
      </div>
    </Stack>
  );
};
