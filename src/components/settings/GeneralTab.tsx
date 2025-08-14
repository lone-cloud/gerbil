import { useState, useEffect } from 'react';
import {
  Stack,
  Text,
  Group,
  TextInput,
  Button,
  Switch,
  rem,
} from '@mantine/core';
import { Folder, FolderOpen } from 'lucide-react';

export const GeneralTab = () => {
  const [installDir, setInstallDir] = useState<string>('');
  const [minimizeToTray, setMinimizeToTray] = useState<boolean>(true);

  useEffect(() => {
    loadCurrentInstallDir();
    loadTraySettings();
  }, []);

  const loadCurrentInstallDir = async () => {
    try {
      const currentDir = await window.electronAPI.kobold.getCurrentInstallDir();
      setInstallDir(currentDir);
    } catch (error) {
      console.error('Failed to load install directory:', error);
    }
  };

  const loadTraySettings = async () => {
    try {
      const trayEnabled = (await window.electronAPI.config.get(
        'minimizeToTray'
      )) as boolean;
      setMinimizeToTray(trayEnabled !== false);
    } catch (error) {
      console.error('Failed to load tray settings:', error);
    }
  };

  const handleTraySettingChange = async (enabled: boolean) => {
    try {
      setMinimizeToTray(enabled);
      await window.electronAPI.config.set('minimizeToTray', enabled);
    } catch (error) {
      console.error('Failed to save tray setting:', error);
    }
  };

  const handleSelectInstallDir = async () => {
    try {
      const selectedDir =
        await window.electronAPI.kobold.selectInstallDirectory();

      if (selectedDir) {
        setInstallDir(selectedDir);
      }
    } catch (error) {
      console.error('Failed to select install directory:', error);
    }
  };

  return (
    <Stack gap="lg" h="100%">
      <div>
        <Text fw={500} mb="sm">
          Installation Directory
        </Text>
        <Text size="sm" c="dimmed" mb="md">
          Choose where application files will be downloaded and stored
        </Text>
        <Group gap="xs">
          <TextInput
            value={installDir}
            readOnly
            placeholder="Default installation directory"
            style={{ flex: 1 }}
            leftSection={<Folder style={{ width: rem(16), height: rem(16) }} />}
          />
          <Button
            variant="outline"
            onClick={handleSelectInstallDir}
            leftSection={
              <FolderOpen style={{ width: rem(16), height: rem(16) }} />
            }
          >
            Browse
          </Button>
        </Group>
      </div>

      <div>
        <Text fw={500} mb="sm">
          Window Behavior
        </Text>
        <Text size="sm" c="dimmed" mb="md">
          Choose what happens when you close or minimize the window
        </Text>
        <Switch
          checked={minimizeToTray}
          onChange={(event) =>
            handleTraySettingChange(event.currentTarget.checked)
          }
          label="Minimize to system tray"
        />
      </div>
    </Stack>
  );
};
