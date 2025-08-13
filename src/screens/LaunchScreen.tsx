import {
  Button,
  Card,
  Text,
  Title,
  Container,
  Stack,
  Group,
  ActionIcon,
  Switch,
  Slider,
  TextInput,
  NumberInput,
  Tooltip,
  Checkbox,
} from '@mantine/core';
import { RotateCcw, File, Info } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { ConfigFileSelect } from '@/components/ConfigFileSelect';
import { useLaunchConfig } from '@/hooks/useLaunchConfig';
import type { ConfigFile } from '@/types';

interface LaunchScreenProps {
  onLaunch: () => void;
}

export const LaunchScreen = ({ onLaunch }: LaunchScreenProps) => {
  const [configFiles, setConfigFiles] = useState<ConfigFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [, setInstallDir] = useState<string>('');
  const {
    serverOnly,
    gpuLayers,
    autoGpuLayers,
    contextSize,
    modelPath,
    additionalArguments,
    parseAndApplyConfigFile,
    loadSavedSettings,
    loadConfigFromFile,
    handleServerOnlyChange,
    handleGpuLayersChange,
    handleAutoGpuLayersChange,
    handleContextSizeChangeWithStep,
    handleModelPathChange,
    handleSelectModelFile,
    handleAdditionalArgumentsChange,
  } = useLaunchConfig();

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

      await loadSavedSettings();

      const currentSelectedFile = await loadConfigFromFile(files, savedConfig);
      if (currentSelectedFile && !selectedFile) {
        setSelectedFile(currentSelectedFile);
      }
    } finally {
      setLoading(false);
    }
  }, [selectedFile, loadSavedSettings, loadConfigFromFile]);

  const handleFileSelection = async (fileName: string) => {
    setSelectedFile(fileName);
    await window.electronAPI.kobold.setSelectedConfig(fileName);

    const selectedConfig = configFiles.find((f) => f.name === fileName);
    if (selectedConfig) {
      await parseAndApplyConfigFile(selectedConfig.path);
    }
  };

  useEffect(() => {
    void loadConfigFiles();

    const handleInstallDirChange = () => {
      void loadConfigFiles();
    };

    const cleanup = window.electronAPI.kobold.onInstallDirChanged(
      handleInstallDirChange
    );

    return cleanup;
  }, [loadConfigFiles]);

  const handleLaunch = async () => {
    try {
      const selectedConfig = selectedFile
        ? configFiles.find((f) => f.name === selectedFile)
        : null;

      const args: string[] = [];

      if (modelPath) {
        args.push('--model', modelPath);
      }

      if (autoGpuLayers) {
        args.push('--gpulayers', '-1');
      } else if (gpuLayers > 0) {
        args.push('--gpulayers', gpuLayers.toString());
      }

      if (contextSize) {
        args.push('--contextsize', contextSize.toString());
      }

      if (additionalArguments.trim()) {
        const additionalArgs = additionalArguments.trim().split(/\s+/);
        args.push(...additionalArgs);
      }

      const result = await window.electronAPI.kobold.launchKoboldCpp(
        args,
        selectedConfig?.path
      );

      if (result.success) {
        onLaunch();
      } else {
        console.error('Launch failed:', result.error);
      }
    } catch (error) {
      console.error('Error launching KoboldCpp:', error);
    }
  };

  return (
    <Container size="sm" py="xl">
      <Card withBorder radius="md" shadow="sm">
        <Stack gap="lg">
          <Title order={3}>Launch Configuration</Title>

          <Card withBorder radius="md" w="100%">
            <Group justify="space-between" mb="md">
              <Text fw={500}>Select Configuration</Text>
              <ActionIcon
                variant="light"
                onClick={loadConfigFiles}
                loading={loading}
                size="sm"
              >
                <RotateCcw size={16} />
              </ActionIcon>
            </Group>

            <ConfigFileSelect
              configFiles={configFiles}
              selectedFile={selectedFile}
              loading={loading}
              onFileSelection={handleFileSelection}
            />
          </Card>

          <Card withBorder radius="md" w="100%">
            <Text fw={500} mb="md">
              Launch Settings
            </Text>

            <Stack gap="l">
              <div>
                <Text size="sm" fw={500} mb="xs">
                  Model File
                </Text>
                <Group gap="xs">
                  <TextInput
                    placeholder="Select a .gguf model file"
                    value={modelPath}
                    onChange={(event) =>
                      handleModelPathChange(event.currentTarget.value)
                    }
                    style={{ flex: 1 }}
                  />
                  <Button
                    onClick={handleSelectModelFile}
                    variant="light"
                    leftSection={<File size={16} />}
                  >
                    Browse
                  </Button>
                </Group>
              </div>

              <div>
                <Group justify="space-between" align="center" mb="xs">
                  <Group gap="xs" align="center">
                    <Text size="sm" fw={500}>
                      GPU Layers
                    </Text>
                    <Tooltip
                      label="The number of layer's to offload to your GPU's VRAM. Ideally the entire LLM should fit inside the VRAM for optimal performance."
                      multiline
                      w={300}
                      withArrow
                    >
                      <ActionIcon variant="subtle" size="xs" color="gray">
                        <Info size={14} />
                      </ActionIcon>
                    </Tooltip>
                  </Group>
                  <Group gap="lg" align="center">
                    <Group gap="xs" align="center">
                      <Checkbox
                        label="Auto"
                        checked={autoGpuLayers}
                        onChange={(event) =>
                          handleAutoGpuLayersChange(event.currentTarget.checked)
                        }
                        size="sm"
                      />
                      <Tooltip
                        label="Automatically try to allocate the GPU layers based on available VRAM."
                        multiline
                        w={300}
                        withArrow
                      >
                        <ActionIcon variant="subtle" size="xs" color="gray">
                          <Info size={14} />
                        </ActionIcon>
                      </Tooltip>
                    </Group>
                    <NumberInput
                      value={gpuLayers}
                      onChange={(value) =>
                        handleGpuLayersChange(Number(value) || 0)
                      }
                      min={0}
                      max={100}
                      step={1}
                      size="sm"
                      w={80}
                      disabled={autoGpuLayers}
                      hideControls
                    />
                  </Group>
                </Group>
                <Slider
                  value={gpuLayers}
                  min={0}
                  max={100}
                  step={1}
                  onChange={handleGpuLayersChange}
                  disabled={autoGpuLayers}
                />
              </div>

              <div>
                <Group justify="space-between" align="center" mb="xs">
                  <Group gap="xs" align="center">
                    <Text size="sm" fw={500}>
                      Context Size
                    </Text>
                    <Tooltip
                      label="Controls the memory allocated for maximum context size. The larger the context, the larger the required memory."
                      multiline
                      w={300}
                      withArrow
                    >
                      <ActionIcon variant="subtle" size="xs" color="gray">
                        <Info size={14} />
                      </ActionIcon>
                    </Tooltip>
                  </Group>
                  <NumberInput
                    value={contextSize}
                    onChange={(value) =>
                      handleContextSizeChangeWithStep(Number(value) || 256)
                    }
                    min={256}
                    max={131072}
                    step={256}
                    size="sm"
                    w={100}
                    hideControls
                  />
                </Group>
                <Slider
                  value={contextSize}
                  min={256}
                  max={131072}
                  step={1}
                  onChange={handleContextSizeChangeWithStep}
                />
              </div>

              <div>
                <Group gap="xs" align="center" mb="xs">
                  <Text size="sm" fw={500}>
                    Additional arguments
                  </Text>
                  <Tooltip
                    label="Additional command line arguments to pass to the KoboldCPP binary. Leave this empty if you don't know what they are."
                    multiline
                    w={300}
                    withArrow
                  >
                    <ActionIcon variant="subtle" size="xs" color="gray">
                      <Info size={14} />
                    </ActionIcon>
                  </Tooltip>
                </Group>
                <TextInput
                  placeholder="Additional command line arguments"
                  value={additionalArguments}
                  onChange={(event) =>
                    handleAdditionalArgumentsChange(event.currentTarget.value)
                  }
                />
              </div>

              <div>
                <Group gap="xs" align="center" mb="xs">
                  <Text size="sm" fw={500}>
                    Server-only mode
                  </Text>
                  <Tooltip
                    label="In server-only mode, the KoboldAI Lite web UI won't be displayed. Use this if you'll be using your own frontend to interact with the LLM."
                    multiline
                    w={300}
                    withArrow
                  >
                    <ActionIcon variant="subtle" size="xs" color="gray">
                      <Info size={14} />
                    </ActionIcon>
                  </Tooltip>
                </Group>
                <Switch
                  checked={serverOnly}
                  onChange={(event) =>
                    handleServerOnlyChange(event.currentTarget.checked)
                  }
                />
              </div>
            </Stack>
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
