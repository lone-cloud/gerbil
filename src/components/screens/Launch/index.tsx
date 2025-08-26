import { Card, Container, Stack, Tabs, Group, Button } from '@mantine/core';
import { useState, useEffect, useCallback, useRef } from 'react';
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
    tensorSplit,
    gpuPlatform,
    sdmodel,
    sdt5xxl,
    sdclipl,
    sdclipg,
    sdphotomaker,
    sdvae,
    sdlora,
    sdconvdirect,
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
    try {
      const backends = await window.electronAPI.kobold.getAvailableBackends();

      if (!backend && backends.length > 0) {
        handleBackendChange(backends[0].value);
      }
    } catch (error) {
      window.electronAPI.logs.logError(
        'Failed to set defaults:',
        error as Error
      );
    }
  }, [backend, handleBackendChange]);

  const setInitialDefaults = useCallback(
    async (currentModelPath: string, currentSdModel: string) => {
      try {
        if (
          !defaultsSetRef.current &&
          !currentModelPath.trim() &&
          !currentSdModel.trim()
        ) {
          handleModelPathChange(DEFAULT_MODEL_URL);
          defaultsSetRef.current = true;
        }
      } catch (error) {
        window.electronAPI.logs.logError(
          'Failed to set initial defaults:',
          error as Error
        );
      }
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
    try {
      const success = await window.electronAPI.kobold.saveConfigFile(
        configName,
        buildConfigData()
      );

      if (success) {
        await loadConfigFiles();
        const newFileName = `${configName}.kcpps`;
        setSelectedFile(newFileName);
        await window.electronAPI.kobold.setSelectedConfig(newFileName);
      } else {
        window.electronAPI.logs.logError(
          'Failed to create new configuration',
          new Error('Save operation failed')
        );
      }
    } catch (error) {
      window.electronAPI.logs.logError(
        'Failed to create new configuration:',
        error as Error
      );
    }
  };

  const handleSaveConfig = async () => {
    if (!selectedFile) {
      window.electronAPI.logs.logError(
        'No configuration file selected for saving',
        new Error('Selected file is null')
      );
      return false;
    }

    try {
      const configName = selectedFile.replace(/\.(kcpps|kcppt)$/, '');

      const success = await window.electronAPI.kobold.saveConfigFile(
        configName,
        buildConfigData()
      );

      if (!success) {
        window.electronAPI.logs.logError(
          'Failed to save configuration',
          new Error('Save operation failed')
        );
        return false;
      }

      return true;
    } catch (error) {
      window.electronAPI.logs.logError(
        'Failed to save configuration:',
        error as Error
      );
      return false;
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

            <Tabs value={activeTab} onChange={setActiveTab}>
              <Tabs.List>
                <Tabs.Tab value="general">General</Tabs.Tab>
                <Tabs.Tab value="image">Image Generation</Tabs.Tab>
                <Tabs.Tab value="network">Network</Tabs.Tab>
                <Tabs.Tab value="advanced">Advanced</Tabs.Tab>
              </Tabs.List>

              <div>
                <Tabs.Panel value="general" pt="md">
                  <GeneralTab />
                </Tabs.Panel>

                <Tabs.Panel value="advanced" pt="md">
                  <AdvancedTab />
                </Tabs.Panel>

                <Tabs.Panel value="network" pt="md">
                  <NetworkTab />
                </Tabs.Panel>

                <Tabs.Panel value="image" pt="md">
                  <ImageGenerationTab />
                </Tabs.Panel>
              </div>
            </Tabs>

            <Group justify="flex-end" pt="md">
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
