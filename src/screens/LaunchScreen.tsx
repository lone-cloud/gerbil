import {
  Button,
  Card,
  Text,
  Title,
  Container,
  Stack,
  Group,
  ActionIcon,
  Select,
} from '@mantine/core';
import { IconFile, IconRefresh } from '@tabler/icons-react';
import { useState, useEffect, useCallback } from 'react';

interface ConfigFile {
  name: string;
  path: string;
  size: number;
}

export const LaunchScreen = () => {
  const [configFiles, setConfigFiles] = useState<ConfigFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [, setInstallDir] = useState<string>('');

  const loadConfigFiles = useCallback(async () => {
    try {
      setLoading(true);
      const [files, currentDir, savedConfig] = await Promise.all([
        window.electronAPI.kobold.getConfigFiles(),
        window.electronAPI.kobold.getCurrentInstallDir(),
        window.electronAPI.kobold.getSelectedConfig(),
      ]);
      setConfigFiles(files);
      setInstallDir(currentDir);

      if (savedConfig && files.some((f) => f.name === savedConfig)) {
        setSelectedFile(savedConfig);
      } else if (files.length > 0 && !selectedFile) {
        setSelectedFile(files[0].name);
      }
    } finally {
      setLoading(false);
    }
  }, [selectedFile]);

  const handleFileSelection = async (fileName: string) => {
    setSelectedFile(fileName);
    await window.electronAPI.kobold.setSelectedConfig(fileName);
  };

  useEffect(() => {
    void loadConfigFiles();
  }, [loadConfigFiles]);

  const renderContent = () => {
    if (loading) {
      return (
        <Text c="dimmed" ta="center">
          Loading configuration files...
        </Text>
      );
    }

    if (configFiles.length === 0) {
      return (
        <Text c="dimmed" ta="center">
          No configuration files found in the installation directory.
          <br />
          Please ensure your .kcpps or .kcppt files are in the correct location.
        </Text>
      );
    }

    const selectData = configFiles.map((file) => ({
      value: file.name,
      label: file.name,
    }));

    return (
      <Select
        label="Configuration File"
        placeholder="Select a configuration file"
        value={selectedFile}
        onChange={(value) => value && handleFileSelection(value)}
        data={selectData}
        leftSection={<IconFile size={16} />}
        searchable
        clearable={false}
        w="100%"
      />
    );
  };

  const handleLaunch = async () => {
    if (!selectedFile) return;

    try {
      const selectedConfig = configFiles.find((f) => f.name === selectedFile);
      if (selectedConfig) {
        const result = await window.electronAPI.kobold.launchKoboldCpp([
          selectedConfig.path,
        ]);
        if (result.success) {
          // Launch successful
        } else {
          console.error('Launch failed:', result.error);
        }
      }
    } catch (error) {
      console.error('Error launching KoboldCpp:', error);
    }
  };

  return (
    <Container size="md" py="xl">
      <Card withBorder radius="md" shadow="sm">
        <Stack gap="lg" align="center">
          <Title order={2}>Launch Configuration</Title>

          <Card withBorder radius="md" w="100%">
            <Group justify="space-between" mb="md">
              <Text fw={500}>Select Configuration</Text>
              <ActionIcon
                variant="light"
                onClick={loadConfigFiles}
                loading={loading}
                size="sm"
              >
                <IconRefresh size={16} />
              </ActionIcon>
            </Group>

            {renderContent()}
          </Card>

          <Group gap="md" justify="center">
            <Button
              radius="md"
              disabled={!selectedFile}
              onClick={handleLaunch}
              size="lg"
            >
              {selectedFile ? 'Launch' : 'Select a configuration file'}
            </Button>
          </Group>
        </Stack>
      </Card>
    </Container>
  );
};
