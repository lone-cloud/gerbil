import { useState, useEffect } from 'react';
import {
  Stack,
  Text,
  Group,
  TextInput,
  Button,
  rem,
  Switch,
} from '@mantine/core';
import { Folder, FolderOpen } from 'lucide-react';

export const GeneralTab = () => {
  const [installDir, setInstallDir] = useState<string>('');
  const [minimizeToTray, setMinimizeToTray] = useState<boolean>(false);
  const [platform] = useState(() => navigator.platform.toLowerCase());

  useEffect(() => {
    loadCurrentInstallDir();
    loadMinimizeToTray();
  }, []);

  const loadCurrentInstallDir = async () => {
    try {
      const currentDir = await window.electronAPI.kobold.getCurrentInstallDir();
      setInstallDir(currentDir);
    } catch (error) {
      window.electronAPI.logs.logError(
        'Failed to load install directory:',
        error as Error
      );
    }
  };

  const loadMinimizeToTray = async () => {
    try {
      const setting = await window.electronAPI.config.get('minimizeToTray');
      setMinimizeToTray(setting === true);
    } catch (error) {
      window.electronAPI.logs.logError(
        'Failed to load minimize to tray setting:',
        error as Error
      );
    }
  };

  const handleMinimizeToTrayChange = async (checked: boolean) => {
    try {
      await window.electronAPI.config.set('minimizeToTray', checked);
      setMinimizeToTray(checked);
    } catch (error) {
      window.electronAPI.logs.logError(
        'Failed to save minimize to tray setting:',
        error as Error
      );
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
      window.electronAPI.logs.logError(
        'Failed to select install directory:',
        error as Error
      );
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

      {!platform.includes('mac') && (
        <div>
          <Text fw={500} mb="sm">
            Window Behavior
          </Text>
          <Switch
            checked={minimizeToTray}
            onChange={(event) =>
              handleMinimizeToTrayChange(event.currentTarget.checked)
            }
            label="Minimize to system tray"
            description="When enabled, minimizing the window will hide it to the system tray instead of the taskbar"
          />
        </div>
      )}
    </Stack>
  );
};
