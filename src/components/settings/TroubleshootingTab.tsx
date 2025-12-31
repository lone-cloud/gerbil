import { useState, useEffect } from 'react';
import { Stack, Text, Group, TextInput, Button, rem } from '@mantine/core';
import { Folder, FolderOpen, Monitor, ExternalLink } from 'lucide-react';

export const TroubleshootingTab = () => {
  const [installDir, setInstallDir] = useState('');

  useEffect(() => {
    const loadCurrentInstallDir = async () => {
      const currentDir = await window.electronAPI.kobold.getCurrentInstallDir();
      if (currentDir) {
        setInstallDir(currentDir);
      }
    };

    void loadCurrentInstallDir();
  }, []);

  const handleSelectInstallDir = async () => {
    const selectedDir =
      await window.electronAPI.kobold.selectInstallDirectory();
    if (selectedDir) {
      setInstallDir(selectedDir);
    }
  };

  const handleOpenInstallDir = async () => {
    if (installDir) {
      await window.electronAPI.app.openPath(installDir);
    }
  };

  return (
    <Stack gap="lg" h="100%">
      <div>
        <Text fw={500} mb="xs">
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
            onClick={() => void handleSelectInstallDir()}
            leftSection={
              <FolderOpen style={{ width: rem(16), height: rem(16) }} />
            }
          >
            Browse
          </Button>
          <Button
            variant="outline"
            onClick={() => void handleOpenInstallDir()}
            disabled={!installDir}
            leftSection={
              <ExternalLink style={{ width: rem(16), height: rem(16) }} />
            }
          >
            Open
          </Button>
        </Group>
      </div>

      <div>
        <Text fw={500} mb="xs">
          Diagnostics
        </Text>
        <Text size="sm" c="dimmed" mb="md">
          Diagnostic tools and configuration access
        </Text>
        <Group gap="xs">
          <Button
            variant="outline"
            size="compact-sm"
            leftSection={
              <FolderOpen style={{ width: rem(16), height: rem(16) }} />
            }
            onClick={() => void window.electronAPI.app.showLogsFolder()}
          >
            Show Logs
          </Button>
          <Button
            variant="outline"
            size="compact-sm"
            leftSection={
              <Monitor style={{ width: rem(16), height: rem(16) }} />
            }
            onClick={() => void window.electronAPI.app.viewConfigFile()}
          >
            View Config
          </Button>
        </Group>
      </div>
    </Stack>
  );
};
