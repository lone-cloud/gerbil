import { Card, Container, Stack, Tabs, Group, Button } from '@mantine/core';
import { useState, useEffect, useCallback, useRef } from 'react';
import { tryExecute, error, safeExecute } from '@/utils/logger';
import { useLaunchConfig } from '@/hooks/useLaunchConfig';
import { useLaunchLogic } from '@/hooks/useLaunchLogic';
import { useWarnings } from '@/hooks/useWarnings';
import { GeneralTab } from '@/components/screens/Launch/GeneralTab/index';
import { AdvancedTab } from '@/components/screens/Launch/AdvancedTab';
import { NetworkTab } from '@/components/screens/Launch/NetworkTab';
import { ImageGenerationTab } from '@/components/screens/Launch/ImageGenerationTab';
import { WarningDisplay } from '@/components/WarningDisplay';
import { ConfigFileManager } from '@/components/screens/Launch/ConfigFileManager';
import { DEFAULT_MODEL_URL } from '@/constants';
import type { ConfigFile } from '@/types';

interface LaunchScreenProps {
  onLaunch: () => void;
  onLaunchModeChange?: (isImageMode: boolean) => void;
}

export const LaunchScreen = ({
  onLaunch,
  onLaunchModeChange,
}: LaunchScreenProps) => {
  const [configFiles, setConfigFiles] = useState<ConfigFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [, setInstallDir] = useState<string>('');
  const [activeTab, setActiveTab] = useState<string | null>('general');
  const [configLoaded, setConfigLoaded] = useState<boolean>(false);
  const defaultsSetRef = useRef(false);

  const {
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
    noavx2,
    failsafe,
    lowvram,
    quantmatmul,
    usemmap,
    backend,
    gpuDeviceSelection,
    gpuPlatform,
    tensorSplit,
    sdmodel,
    sdt5xxl,
    sdclipl,
    sdclipg,
    sdphotomaker,
    sdvae,
    sdlora,
    sdconvdirect,
    moecpu,
    moeexperts,
    parseAndApplyConfigFile,
    loadConfigFromFile,
    handleModelPathChange,
    handleBackendChange,
  } = useLaunchConfig();

  const { isLaunching, handleLaunch } = useLaunchLogic({
    modelPath,
    sdmodel,
    onLaunch,
    onLaunchModeChange,
  });

  const { warnings: combinedWarnings } = useWarnings({
    modelPath,
    sdmodel,
    backend,
    noavx2,
    failsafe,
    configLoaded,
  });

  const setHappyDefaults = useCallback(async () => {
    const backends = await safeExecute(
      () => window.electronAPI.kobold.getAvailableBackends(),
      'Failed to set defaults:'
    );

    if (!backend && backends && backends.length > 0) {
      handleBackendChange(backends[0].value);
    }
  }, [backend, handleBackendChange]);

  const setInitialDefaults = useCallback(
    async (currentModelPath: string, currentSdModel: string) => {
      await tryExecute(async () => {
        if (
          !defaultsSetRef.current &&
          !currentModelPath.trim() &&
          !currentSdModel.trim()
        ) {
          handleModelPathChange(DEFAULT_MODEL_URL);
          defaultsSetRef.current = true;
        }
      }, 'Failed to set initial defaults:');
    },
    [handleModelPathChange]
  );

  useEffect(() => {
    if (configLoaded && !defaultsSetRef.current) {
      void setHappyDefaults();
      if (!modelPath.trim() && !sdmodel.trim()) {
        void setInitialDefaults(modelPath, sdmodel);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configLoaded, setHappyDefaults]);

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

    const loadedConfigFileName = await loadConfigFromFile(files, savedConfig);
    if (loadedConfigFileName && !selectedFile) {
      setSelectedFile(loadedConfigFileName);
    }

    setConfigLoaded(true);
  }, [selectedFile, loadConfigFromFile]);

  const handleFileSelection = async (fileName: string) => {
    setSelectedFile(fileName);
    await window.electronAPI.kobold.setSelectedConfig(fileName);

    const selectedConfig = configFiles.find((f) => f.name === fileName);
    if (selectedConfig) {
      await parseAndApplyConfigFile(selectedConfig.path);
    }
  };

  const buildConfigData = () => ({
    autoGpuLayers: autoGpuLayers,
    gpulayers: gpuLayers,
    contextsize: contextSize,
    model: modelPath,
    additionalArguments,
    port,
    host,
    multiuser: multiuser ? 1 : 0,
    multiplayer,
    remotetunnel,
    nocertify,
    websearch,
    noshift,
    flashattention,
    noavx2,
    failsafe,
    usemmap,
    moecpu,
    moeexperts,
    usecuda: backend === 'cuda' || backend === 'rocm',
    usevulkan: backend === 'vulkan',
    useclblast: backend === 'clblast',
    gpuDeviceSelection,
    tensorSplit,
    sdmodel,
    sdt5xxl,
    sdclipl,
    sdclipg,
    sdphotomaker,
    sdvae,
  });

  const handleCreateNewConfig = async (configName: string) => {
    await safeExecute(async () => {
      const fullConfigName = `${configName}.json`;
      const saveSuccess = await window.electronAPI.kobold.saveConfigFile(
        fullConfigName,
        buildConfigData()
      );

      if (saveSuccess) {
        await loadConfigFiles();
        setSelectedFile(fullConfigName);
        await window.electronAPI.kobold.setSelectedConfig(fullConfigName);
      } else {
        error(
          'Failed to create new configuration',
          new Error('Save operation failed')
        );
      }
    }, 'Failed to create new configuration:');
  };

  const handleSaveConfig = async () => {
    if (!selectedFile) {
      error(
        'No configuration file selected for saving',
        new Error('Selected file is null')
      );
      return false;
    }

    const success = await safeExecute(async () => {
      const saveSuccess = await window.electronAPI.kobold.saveConfigFile(
        selectedFile,
        buildConfigData()
      );

      if (!saveSuccess) {
        error(
          'Failed to save configuration',
          new Error('Save operation failed')
        );
        return false;
      }

      return true;
    }, 'Failed to save configuration:');

    return success ?? false;
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

  const handleLaunchClick = () => {
    handleLaunch({
      autoGpuLayers,
      gpuLayers,
      contextSize,
      port: port ?? 5001,
      host,
      multiuser,
      multiplayer,
      remotetunnel,
      nocertify,
      websearch,
      noshift,
      flashattention,
      noavx2,
      failsafe,
      backend,
      lowvram,
      gpuDeviceSelection,
      gpuPlatform,
      tensorSplit,
      quantmatmul,
      usemmap,
      additionalArguments,
      sdt5xxl,
      sdclipl,
      sdclipg,
      sdphotomaker,
      sdvae,
      sdlora,
      sdconvdirect,
      moecpu,
      moeexperts,
    });
  };

  return (
    <Container size="sm">
      <Stack gap="md">
        <Card
          withBorder
          radius="md"
          shadow="sm"
          p="lg"
          style={{ position: 'relative' }}
        >
          <Stack gap="lg">
            <ConfigFileManager
              configFiles={configFiles}
              selectedFile={selectedFile}
              onFileSelection={handleFileSelection}
              onCreateNewConfig={handleCreateNewConfig}
              onSaveConfig={handleSaveConfig}
              onLoadConfigFiles={loadConfigFiles}
            />

            <Tabs
              value={activeTab}
              onChange={setActiveTab}
              styles={{
                root: {
                  maxHeight: '24rem',
                  display: 'flex',
                  flexDirection: 'column',
                },
                panel: {
                  flex: 1,
                  overflow: 'auto',
                  paddingTop: '1rem',
                  paddingRight: '0.5rem',
                },
              }}
            >
              <Tabs.List>
                <Tabs.Tab value="general">General</Tabs.Tab>
                <Tabs.Tab value="image">Image Generation</Tabs.Tab>
                <Tabs.Tab value="network">Network</Tabs.Tab>
                <Tabs.Tab value="advanced">Advanced</Tabs.Tab>
              </Tabs.List>

              <Tabs.Panel value="general">
                <GeneralTab />
              </Tabs.Panel>

              <Tabs.Panel value="advanced">
                <AdvancedTab />
              </Tabs.Panel>

              <Tabs.Panel value="network">
                <NetworkTab />
              </Tabs.Panel>

              <Tabs.Panel value="image">
                <ImageGenerationTab />
              </Tabs.Panel>
            </Tabs>

            <Group justify="flex-end">
              <WarningDisplay warnings={combinedWarnings}>
                <Button
                  radius="md"
                  disabled={(!modelPath && !sdmodel) || isLaunching}
                  onClick={handleLaunchClick}
                  size="lg"
                  variant="filled"
                  color="blue"
                  style={{
                    fontWeight: 600,
                    fontSize: '16px',
                    padding: '12px 28px',
                    minWidth: '120px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}
                >
                  Launch
                </Button>
              </WarningDisplay>
            </Group>
          </Stack>
        </Card>
      </Stack>
    </Container>
  );
};
