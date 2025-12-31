import { Card, Container, Stack, Tabs, Group, Button } from '@mantine/core';
import { useState, useEffect, useCallback, useRef } from 'react';
import { logError } from '@/utils/logger';
import { useLaunchConfigStore } from '@/stores/launchConfig';
import { useLaunchLogic } from '@/hooks/useLaunchLogic';
import { useWarnings } from '@/hooks/useWarnings';
import { GeneralTab } from '@/components/screens/Launch/GeneralTab/index';
import { AdvancedTab } from '@/components/screens/Launch/AdvancedTab';
import { PerformanceTab } from '@/components/screens/Launch/PerformanceTab';
import { NetworkTab } from '@/components/screens/Launch/NetworkTab';
import { ImageGenerationTab } from '@/components/screens/Launch/ImageGenerationTab';
import { WarningDisplay } from '@/components/WarningDisplay';
import { ConfigFileManager } from '@/components/screens/Launch/ConfigFileManager';
import { DEFAULT_MODEL_URL } from '@/constants';
import type { Acceleration, ConfigFile } from '@/types';

interface LaunchScreenProps {
  onLaunch: () => void;
}

export const LaunchScreen = ({ onLaunch }: LaunchScreenProps) => {
  const [configFiles, setConfigFiles] = useState<ConfigFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [, setInstallDir] = useState('');
  const [activeTab, setActiveTab] = useState<string | null>('general');
  const [configLoaded, setConfigLoaded] = useState(false);
  const defaultsSetRef = useRef(false);

  const {
    gpuLayers,
    autoGpuLayers,
    contextSize,
    model,
    additionalArguments,
    preLaunchCommands,
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
    debugmode,
    acceleration,
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
    sdvaecpu,
    sdclipgpu,
    moecpu,
    moeexperts,
    smartcache,
    pipelineparallel,
    parseAndApplyConfigFile,
    loadConfigFromFile,
    setModel,
    setAcceleration,
  } = useLaunchConfigStore();

  const { isLaunching, handleLaunch } = useLaunchLogic({
    model,
    sdmodel,
    onLaunch,
  });

  const { warnings: combinedWarnings } = useWarnings({
    model,
    sdmodel,
    acceleration,
    configLoaded,
  });

  const setHappyDefaults = useCallback(async () => {
    const accelerations =
      await window.electronAPI.kobold.getAvailableAccelerations();

    if (!acceleration && accelerations && accelerations.length > 0) {
      setAcceleration(accelerations[0].value as Acceleration);
    }
  }, [acceleration, setAcceleration]);

  const setInitialDefaults = useCallback(
    (currentModel: string, currentSdModel: string) => {
      if (
        !defaultsSetRef.current &&
        !currentModel.trim() &&
        !currentSdModel.trim()
      ) {
        setModel(DEFAULT_MODEL_URL);
        defaultsSetRef.current = true;
      }
    },
    [setModel]
  );

  useEffect(() => {
    if (configLoaded && !defaultsSetRef.current) {
      void setHappyDefaults();
      if (!model.trim() && !sdmodel.trim()) {
        void setInitialDefaults(model, sdmodel);
      }
    }
  }, [configLoaded, setHappyDefaults, model, sdmodel, setInitialDefaults]);

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
  }, [
    selectedFile,
    loadConfigFromFile,
    setConfigFiles,
    setInstallDir,
    setSelectedFile,
    setConfigLoaded,
  ]);

  const handleFileSelection = async (fileName: string) => {
    setSelectedFile(fileName);
    await window.electronAPI.kobold.setSelectedConfig(fileName);

    const selectedConfig = configFiles.find((f) => f.name === fileName);
    if (selectedConfig) {
      await parseAndApplyConfigFile(selectedConfig.path);
    }
  };

  const buildConfigData = () => ({
    autoGpuLayers,
    gpulayers: gpuLayers,
    contextsize: contextSize,
    model,
    additionalArguments,
    preLaunchCommands: preLaunchCommands.filter((cmd) => cmd.trim() !== ''),
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
    debugmode,
    moecpu,
    moeexperts,
    smartcache,
    pipelineparallel,
    usecuda: acceleration === 'cuda' || acceleration === 'rocm',
    usevulkan: acceleration === 'vulkan',
    useclblast: acceleration === 'clblast',
    gpuDeviceSelection,
    tensorSplit,
    sdmodel,
    sdt5xxl,
    sdclipl,
    sdclipg,
    sdphotomaker,
    sdvae,
    sdlora,
    sdconvdirect,
    sdvaecpu,
    sdclipgpu,
  });

  const handleCreateNewConfig = async (configName: string) => {
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
      logError(
        'Failed to create new configuration',
        new Error('Save operation failed')
      );
    }
  };

  const handleSaveConfig = async () => {
    if (!selectedFile) {
      logError(
        'No configuration file selected for saving',
        new Error('Selected file is null')
      );
      return false;
    }

    const saveSuccess = await window.electronAPI.kobold.saveConfigFile(
      selectedFile,
      buildConfigData()
    );

    if (!saveSuccess) {
      logError(
        'Failed to save configuration',
        new Error('Save operation failed')
      );
      return false;
    }

    return true;
  };

  const handleDeleteConfig = async (fileName: string) => {
    const deleteSuccess =
      await window.electronAPI.kobold.deleteConfigFile(fileName);

    if (deleteSuccess) {
      await loadConfigFiles();

      const updatedFiles = await window.electronAPI.kobold.getConfigFiles();
      if (updatedFiles.length > 0) {
        const firstConfig = updatedFiles[0].name;
        setSelectedFile(firstConfig);
        await window.electronAPI.kobold.setSelectedConfig(firstConfig);

        const selectedConfig = updatedFiles.find((f) => f.name === firstConfig);
        if (selectedConfig) {
          await parseAndApplyConfigFile(selectedConfig.path);
        }
      } else {
        setSelectedFile(null);
        await window.electronAPI.kobold.setSelectedConfig('');
      }
    }

    return deleteSuccess;
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadConfigFiles();

    const handleInstallDirChange = () => {
      void loadConfigFiles();
    };

    const cleanup = window.electronAPI.kobold.onInstallDirChanged(
      handleInstallDirChange
    );

    return cleanup;
  }, [loadConfigFiles]);

  const handleLaunchClick = useCallback(() => {
    void handleLaunch({
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
      acceleration,
      lowvram,
      gpuDeviceSelection,
      gpuPlatform,
      tensorSplit,
      quantmatmul,
      usemmap,
      debugmode,
      additionalArguments,
      preLaunchCommands,
      sdt5xxl,
      sdclipl,
      sdclipg,
      sdphotomaker,
      sdvae,
      sdlora,
      sdconvdirect,
      sdvaecpu,
      sdclipgpu,
      moecpu,
      moeexperts,
      smartcache,
      pipelineparallel,
    });
  }, [
    handleLaunch,
    autoGpuLayers,
    gpuLayers,
    contextSize,
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
    acceleration,
    lowvram,
    gpuDeviceSelection,
    gpuPlatform,
    tensorSplit,
    quantmatmul,
    usemmap,
    debugmode,
    additionalArguments,
    preLaunchCommands,
    sdt5xxl,
    sdclipl,
    sdclipg,
    sdphotomaker,
    sdvae,
    sdlora,
    sdconvdirect,
    sdvaecpu,
    sdclipgpu,
    moecpu,
    moeexperts,
    smartcache,
    pipelineparallel,
  ]);

  return (
    <Container size="sm" mt="md">
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
              onDeleteConfig={handleDeleteConfig}
              onLoadConfigFiles={loadConfigFiles}
            />

            <Tabs
              value={activeTab}
              onChange={setActiveTab}
              styles={{
                root: {
                  maxHeight: '51vh',
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
                <Tabs.Tab value="performance">Performance</Tabs.Tab>
                <Tabs.Tab value="network">Network</Tabs.Tab>
                <Tabs.Tab value="advanced">Advanced</Tabs.Tab>
              </Tabs.List>

              <Tabs.Panel value="general">
                <GeneralTab configLoaded={configLoaded} />
              </Tabs.Panel>

              <Tabs.Panel value="image">
                <ImageGenerationTab />
              </Tabs.Panel>

              <Tabs.Panel value="performance">
                <PerformanceTab />
              </Tabs.Panel>

              <Tabs.Panel value="network">
                <NetworkTab />
              </Tabs.Panel>

              <Tabs.Panel value="advanced">
                <AdvancedTab />
              </Tabs.Panel>
            </Tabs>

            <Group justify="flex-end">
              <WarningDisplay warnings={combinedWarnings}>
                <Button
                  radius="md"
                  disabled={(!model && !sdmodel) || isLaunching}
                  onClick={handleLaunchClick}
                  size="lg"
                  variant="filled"
                  color="blue"
                  style={{
                    fontWeight: 600,
                    fontSize: '1em',
                    padding: '0.75rem 1.75rem',
                    minWidth: '7.5rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.03125rem',
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
