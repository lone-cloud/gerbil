import { Button, Group, Stack, Text, TextInput, rem } from '@mantine/core';
import { ExternalLink, Folder, FolderOpen, Monitor } from 'lucide-react';
import { useEffect, useState } from 'react';

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
    const selectedDir = await window.electronAPI.kobold.selectInstallDirectory();
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
            aria-label="Installation directory path"
            leftSection={<Folder style={{ height: rem(16), width: rem(16) }} />}
          />
          <Button
            variant="outline"
            onClick={() => void handleSelectInstallDir()}
            leftSection={<FolderOpen style={{ height: rem(16), width: rem(16) }} />}
          >
            Browse
          </Button>
          <Button
            variant="outline"
            onClick={() => void handleOpenInstallDir()}
            disabled={!installDir}
            leftSection={<ExternalLink style={{ height: rem(16), width: rem(16) }} />}
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
            leftSection={<FolderOpen style={{ height: rem(16), width: rem(16) }} />}
            onClick={() => void window.electronAPI.app.showLogsFolder()}
          >
            Show Logs
          </Button>
          <Button
            variant="outline"
            size="compact-sm"
            leftSection={<Monitor style={{ height: rem(16), width: rem(16) }} />}
            onClick={() => void window.electronAPI.app.viewConfigFile()}
          >
            View Config
          </Button>
        </Group>
      </div>
    </Stack>
  );
};
