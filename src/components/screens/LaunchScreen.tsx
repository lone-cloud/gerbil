import {
  Card,
  Container,
  Stack,
  Tabs,
  Text,
  Title,
  Group,
  Button,
} from '@mantine/core';
import { useState, useEffect, useCallback } from 'react';
import { useLaunchConfig } from '@/hooks/useLaunchConfig';
import { ConfigurationManager } from '@/components/launch/ConfigurationManager';
import { GeneralTab } from '@/components/launch/GeneralTab';
import { AdvancedTab } from '@/components/launch/AdvancedTab';
import { NetworkTab } from '@/components/launch/NetworkTab';
import { SaveConfigModal } from '@/components/launch/SaveConfigModal';
import type { ConfigFile } from '@/types';

interface LaunchScreenProps {
  onLaunch: () => void;
}

export const LaunchScreen = ({ onLaunch }: LaunchScreenProps) => {
  const [configFiles, setConfigFiles] = useState<ConfigFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [, setInstallDir] = useState<string>('');
  const [isLaunching, setIsLaunching] = useState(false);
  const [activeTab, setActiveTab] = useState<string | null>('general');
  const [saveModalOpened, setSaveModalOpened] = useState(false);
  const [newConfigName, setNewConfigName] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const {
    serverOnly,
    gpuLayers,
    autoGpuLayers,
    contextSize,
    modelPath,
    additionalArguments,
    port,
    host,
    multiuser,
    multiplayer,
    remotetunnel,
    nocertify,
    websearch,
    noshift,
    flashattention,
    backend,
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
    handlePortChange,
    handleHostChange,
    handleMultiuserChange,
    handleMultiplayerChange,
    handleRemotetunnelChange,
    handleNocertifyChange,
    handleWebsearchChange,
    handleNoshiftChange,
    handleFlashattentionChange,
    handleBackendChange,
  } = useLaunchConfig();

  const loadConfigFiles = useCallback(async () => {
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
  }, [selectedFile, loadSavedSettings, loadConfigFromFile]);

  const handleFileSelection = async (fileName: string) => {
    setSelectedFile(fileName);
    await window.electronAPI.kobold.setSelectedConfig(fileName);

    const selectedConfig = configFiles.find((f) => f.name === fileName);
    if (selectedConfig) {
      await parseAndApplyConfigFile(selectedConfig.path);
    }

    setHasUnsavedChanges(false);
  };

  const handleModelPathChangeWithTracking = (path: string) => {
    handleModelPathChange(path);
    setHasUnsavedChanges(true);
  };

  const handleGpuLayersChangeWithTracking = (layers: number) => {
    handleGpuLayersChange(layers);
    setHasUnsavedChanges(true);
  };

  const handleAutoGpuLayersChangeWithTracking = (auto: boolean) => {
    handleAutoGpuLayersChange(auto);
    setHasUnsavedChanges(true);
  };

  const handleContextSizeChangeWithTracking = (size: number) => {
    handleContextSizeChangeWithStep(size);
    setHasUnsavedChanges(true);
  };

  const handleAdditionalArgumentsChangeWithTracking = (args: string) => {
    handleAdditionalArgumentsChange(args);
    setHasUnsavedChanges(true);
  };

  const handleServerOnlyChangeWithTracking = (serverOnly: boolean) => {
    handleServerOnlyChange(serverOnly);
    setHasUnsavedChanges(true);
  };

  const handlePortChangeWithTracking = (port: number) => {
    handlePortChange(port);
    setHasUnsavedChanges(true);
  };

  const handleHostChangeWithTracking = (host: string) => {
    handleHostChange(host);
    setHasUnsavedChanges(true);
  };

  const handleNoshiftChangeWithTracking = (noshift: boolean) => {
    handleNoshiftChange(noshift);
    setHasUnsavedChanges(true);
  };

  const handleFlashattentionChangeWithTracking = (flashattention: boolean) => {
    handleFlashattentionChange(flashattention);
    setHasUnsavedChanges(true);
  };

  const handleMultiuserChangeWithTracking = (multiuser: boolean) => {
    handleMultiuserChange(multiuser);
    setHasUnsavedChanges(true);
  };

  const handleMultiplayerChangeWithTracking = (multiplayer: boolean) => {
    handleMultiplayerChange(multiplayer);
    setHasUnsavedChanges(true);
  };

  const handleRemotetunnelChangeWithTracking = (remotetunnel: boolean) => {
    handleRemotetunnelChange(remotetunnel);
    setHasUnsavedChanges(true);
  };

  const handleNocertifyChangeWithTracking = (nocertify: boolean) => {
    handleNocertifyChange(nocertify);
    setHasUnsavedChanges(true);
  };

  const handleWebsearchChangeWithTracking = (websearch: boolean) => {
    handleWebsearchChange(websearch);
    setHasUnsavedChanges(true);
  };

  const handleBackendChangeWithTracking = (backend: string) => {
    handleBackendChange(backend);
    setHasUnsavedChanges(true);
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

  // eslint-disable-next-line sonarjs/cognitive-complexity
  const handleLaunch = async () => {
    if (isLaunching || !modelPath) {
      return;
    }

    setIsLaunching(true);

    try {
      const selectedConfig = selectedFile
        ? configFiles.find((f) => f.name === selectedFile)
        : null;

      const args: string[] = [];

      args.push('--model', modelPath);

      if (autoGpuLayers) {
        args.push('--gpulayers', '-1');
      } else if (gpuLayers > 0) {
        args.push('--gpulayers', gpuLayers.toString());
      }

      if (contextSize) {
        args.push('--contextsize', contextSize.toString());
      }

      if (port !== 5001) {
        args.push('--port', port.toString());
      }

      if (host !== 'localhost') {
        args.push('--host', host);
      }

      if (multiuser) {
        args.push('--multiuser', '1');
      }

      if (multiplayer) {
        args.push('--multiplayer');
      }

      if (remotetunnel) {
        args.push('--remotetunnel');
      }

      if (nocertify) {
        args.push('--nocertify');
      }

      if (websearch) {
        args.push('--websearch');
      }

      if (noshift) {
        args.push('--noshift');
      }

      if (flashattention) {
        args.push('--flashattention');
      }

      if (backend && backend !== 'cpu') {
        if (backend === 'cuda') {
          args.push('--usecuda');
        } else if (backend === 'rocm') {
          args.push('--usecuda');
        } else if (backend === 'vulkan') {
          args.push('--usevulkan');
        } else if (backend === 'clblast') {
          args.push('--useclblast');
        } else if (backend === 'failsafe') {
          args.push('--failsafe');
        }
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
        setTimeout(() => {
          onLaunch();
        }, 100);
      } else {
        console.error('Launch failed:', result.error);
      }
    } catch (error) {
      console.error('Error launching KoboldCpp:', error);
    } finally {
      setIsLaunching(false);
    }
  };

  return (
    <Container size="sm">
      <Stack gap="lg">
        <Card withBorder radius="md" shadow="sm">
          <Group justify="space-between" align="center">
            <div>
              <Title order={3}>Launch Configuration</Title>
              <Text size="sm" c="dimmed">
                {selectedFile
                  ? `Using: ${selectedFile}`
                  : 'No configuration file selected'}
                {hasUnsavedChanges && (
                  <Text span c="orange">
                    {' '}
                    • Unsaved changes
                  </Text>
                )}
              </Text>
            </div>
            <Button
              radius="md"
              disabled={!modelPath || isLaunching}
              onClick={handleLaunch}
              loading={isLaunching}
              size="lg"
              variant="filled"
            >
              {isLaunching ? 'Launching...' : 'Launch'}
            </Button>
          </Group>
        </Card>

        <Card withBorder radius="md">
          <ConfigurationManager
            configFiles={configFiles}
            selectedFile={selectedFile}
            onFileSelection={handleFileSelection}
            onRefresh={loadConfigFiles}
            onSaveAsNew={() => setSaveModalOpened(true)}
            onUpdateCurrent={() => {}}
          />
        </Card>

        <Card withBorder radius="md">
          <Tabs value={activeTab} onChange={setActiveTab}>
            <Tabs.List>
              <Tabs.Tab value="general">General</Tabs.Tab>
              <Tabs.Tab value="image">Image Generation</Tabs.Tab>
              <Tabs.Tab value="network">Network</Tabs.Tab>
              <Tabs.Tab value="advanced">Advanced</Tabs.Tab>
            </Tabs.List>

            <div style={{ minHeight: '300px' }}>
              <Tabs.Panel value="general" pt="md">
                <GeneralTab
                  modelPath={modelPath}
                  gpuLayers={gpuLayers}
                  autoGpuLayers={autoGpuLayers}
                  contextSize={contextSize}
                  backend={backend}
                  onModelPathChange={handleModelPathChangeWithTracking}
                  onSelectModelFile={handleSelectModelFile}
                  onGpuLayersChange={handleGpuLayersChangeWithTracking}
                  onAutoGpuLayersChange={handleAutoGpuLayersChangeWithTracking}
                  onContextSizeChange={handleContextSizeChangeWithTracking}
                  onBackendChange={handleBackendChangeWithTracking}
                />
              </Tabs.Panel>

              <Tabs.Panel value="advanced" pt="md">
                <AdvancedTab
                  additionalArguments={additionalArguments}
                  serverOnly={serverOnly}
                  noshift={noshift}
                  flashattention={flashattention}
                  onAdditionalArgumentsChange={
                    handleAdditionalArgumentsChangeWithTracking
                  }
                  onServerOnlyChange={handleServerOnlyChangeWithTracking}
                  onNoshiftChange={handleNoshiftChangeWithTracking}
                  onFlashattentionChange={
                    handleFlashattentionChangeWithTracking
                  }
                />
              </Tabs.Panel>

              <Tabs.Panel value="network" pt="md">
                <NetworkTab
                  port={port}
                  host={host}
                  multiuser={multiuser}
                  multiplayer={multiplayer}
                  remotetunnel={remotetunnel}
                  nocertify={nocertify}
                  websearch={websearch}
                  onPortChange={handlePortChangeWithTracking}
                  onHostChange={handleHostChangeWithTracking}
                  onMultiuserChange={handleMultiuserChangeWithTracking}
                  onMultiplayerChange={handleMultiplayerChangeWithTracking}
                  onRemotetunnelChange={handleRemotetunnelChangeWithTracking}
                  onNocertifyChange={handleNocertifyChangeWithTracking}
                  onWebsearchChange={handleWebsearchChangeWithTracking}
                />
              </Tabs.Panel>

              <Tabs.Panel value="image" pt="md">
                <Stack gap="lg" align="center" py="xl">
                  <Text c="dimmed" ta="center">
                    Image generation configuration will be available in a future
                    update.
                  </Text>
                </Stack>
              </Tabs.Panel>
            </div>
          </Tabs>
        </Card>

        <SaveConfigModal
          opened={saveModalOpened}
          onClose={() => setSaveModalOpened(false)}
          configName={newConfigName}
          onConfigNameChange={setNewConfigName}
          onSave={() => {
            setSaveModalOpened(false);
            setNewConfigName('');
          }}
        />
      </Stack>
    </Container>
  );
};
