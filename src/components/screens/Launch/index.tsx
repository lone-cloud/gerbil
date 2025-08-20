import { Card, Container, Stack, Tabs, Group, Button } from '@mantine/core';
import { useState, useEffect, useCallback } from 'react';
import { useLaunchConfig } from '@/hooks/useLaunchConfig';
import { useTrackedConfigHandlers } from '@/hooks/useTrackedConfigHandlers';
import { useLaunchLogic } from '@/hooks/useLaunchLogic';
import { useWarnings } from '@/hooks/useWarnings';
import { GeneralTab } from '@/components/screens/Launch/GeneralTab';
import { AdvancedTab } from '@/components/screens/Launch/AdvancedTab';
import { NetworkTab } from '@/components/screens/Launch/NetworkTab';
import { ImageGenerationTab } from '@/components/screens/Launch/ImageGenerationTab';
import { WarningDisplay } from '@/components/WarningDisplay';
import { ConfigFileManager } from '@/components/ConfigFileManager';
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
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [warnings, setWarnings] = useState<
    Array<{ type: 'warning' | 'info'; message: string }>
  >([]);

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
    backend,
    gpuDevice,
    sdmodel,
    sdt5xxl,
    sdclipl,
    sdclipg,
    sdphotomaker,
    sdvae,
    sdlora,
    parseAndApplyConfigFile,
    loadSavedSettings,
    loadConfigFromFile,
    handleSelectModelFile,
    handleGpuDeviceChange,
    handleSelectSdmodelFile,
    handleSelectSdt5xxlFile,
    handleSelectSdcliplFile,
    handleSelectSdclipgFile,
    handleSelectSdphotomakerFile,
    handleSelectSdvaeFile,
    handleSelectSdloraFile,
    handleApplyPreset,
    handleModelPathChange,
    handleGpuLayersChange,
    handleAutoGpuLayersChange,
    handleContextSizeChangeWithStep,
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
    handleNoavx2Change,
    handleFailsafeChange,
    handleLowvramChange,
    handleQuantmatmulChange,
    handleBackendChange,
    handleSdmodelChange,
    handleSdt5xxlChange,
    handleSdcliplChange,
    handleSdclipgChange,
    handleSdphotomakerChange,
    handleSdvaeChange,
    handleSdloraChange,
  } = useLaunchConfig();

  const trackedHandlers = useTrackedConfigHandlers({
    setHasUnsavedChanges,
    handlers: {
      handleModelPathChange,
      handleGpuLayersChange,
      handleAutoGpuLayersChange,
      handleContextSizeChangeWithStep,
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
      handleNoavx2Change,
      handleFailsafeChange,
      handleLowvramChange,
      handleQuantmatmulChange,
      handleBackendChange,
      handleSdmodelChange,
      handleSdt5xxlChange,
      handleSdcliplChange,
      handleSdclipgChange,
      handleSdphotomakerChange,
      handleSdvaeChange,
      handleSdloraChange,
    },
  });

  const { isLaunching, handleLaunch } = useLaunchLogic({
    modelPath,
    sdmodel,
    onLaunch,
    onLaunchModeChange,
  });

  const combinedWarnings = useWarnings({ modelPath, sdmodel, warnings });

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

  const buildConfigData = () => ({
    gpulayers: gpuLayers,
    contextsize: contextSize,
    model_param: modelPath,
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
    usecuda: backend === 'cuda' || backend === 'rocm',
    usevulkan: backend === 'vulkan',
    useclblast: backend === 'clblast',
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
        setHasUnsavedChanges(false);
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
      return;
    }

    try {
      const configName = selectedFile.replace('.kcpps', '');

      const success = await window.electronAPI.kobold.saveConfigFile(
        configName,
        buildConfigData()
      );

      if (success) {
        setHasUnsavedChanges(false);
      } else {
        window.electronAPI.logs.logError(
          'Failed to save configuration',
          new Error('Save operation failed')
        );
      }
    } catch (error) {
      window.electronAPI.logs.logError(
        'Failed to save configuration:',
        error as Error
      );
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
      backend,
      lowvram,
      gpuDevice,
      quantmatmul,
      additionalArguments,
      sdt5xxl,
      sdclipl,
      sdclipg,
      sdphotomaker,
      sdvae,
      sdlora,
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
              hasUnsavedChanges={hasUnsavedChanges}
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
                  <GeneralTab
                    modelPath={modelPath}
                    gpuLayers={gpuLayers}
                    autoGpuLayers={autoGpuLayers}
                    contextSize={contextSize}
                    backend={backend}
                    gpuDevice={gpuDevice}
                    noavx2={noavx2}
                    failsafe={failsafe}
                    onModelPathChange={
                      trackedHandlers.handleModelPathChangeWithTracking
                    }
                    onSelectModelFile={handleSelectModelFile}
                    onGpuLayersChange={
                      trackedHandlers.handleGpuLayersChangeWithTracking
                    }
                    onAutoGpuLayersChange={
                      trackedHandlers.handleAutoGpuLayersChangeWithTracking
                    }
                    onContextSizeChange={
                      trackedHandlers.handleContextSizeChangeWithTracking
                    }
                    onBackendChange={
                      trackedHandlers.handleBackendChangeWithTracking
                    }
                    onGpuDeviceChange={handleGpuDeviceChange}
                    onWarningsChange={setWarnings}
                  />
                </Tabs.Panel>

                <Tabs.Panel value="advanced" pt="md">
                  <AdvancedTab
                    additionalArguments={additionalArguments}
                    noshift={noshift}
                    flashattention={flashattention}
                    noavx2={noavx2}
                    failsafe={failsafe}
                    lowvram={lowvram}
                    quantmatmul={quantmatmul}
                    backend={backend}
                    onAdditionalArgumentsChange={
                      trackedHandlers.handleAdditionalArgumentsChangeWithTracking
                    }
                    onNoshiftChange={
                      trackedHandlers.handleNoshiftChangeWithTracking
                    }
                    onFlashattentionChange={
                      trackedHandlers.handleFlashattentionChangeWithTracking
                    }
                    onNoavx2Change={
                      trackedHandlers.handleNoavx2ChangeWithTracking
                    }
                    onFailsafeChange={
                      trackedHandlers.handleFailsafeChangeWithTracking
                    }
                    onLowvramChange={
                      trackedHandlers.handleLowvramChangeWithTracking
                    }
                    onQuantmatmulChange={
                      trackedHandlers.handleQuantmatmulChangeWithTracking
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
                    onPortChange={trackedHandlers.handlePortChangeWithTracking}
                    onHostChange={trackedHandlers.handleHostChangeWithTracking}
                    onMultiuserChange={
                      trackedHandlers.handleMultiuserChangeWithTracking
                    }
                    onMultiplayerChange={
                      trackedHandlers.handleMultiplayerChangeWithTracking
                    }
                    onRemotetunnelChange={
                      trackedHandlers.handleRemotetunnelChangeWithTracking
                    }
                    onNocertifyChange={
                      trackedHandlers.handleNocertifyChangeWithTracking
                    }
                    onWebsearchChange={
                      trackedHandlers.handleWebsearchChangeWithTracking
                    }
                  />
                </Tabs.Panel>

                <Tabs.Panel value="image" pt="md">
                  <ImageGenerationTab
                    sdmodel={sdmodel}
                    sdt5xxl={sdt5xxl}
                    sdclipl={sdclipl}
                    sdclipg={sdclipg}
                    sdphotomaker={sdphotomaker}
                    sdvae={sdvae}
                    sdlora={sdlora}
                    onSdmodelChange={
                      trackedHandlers.handleSdmodelChangeWithTracking
                    }
                    onSelectSdmodelFile={handleSelectSdmodelFile}
                    onSdt5xxlChange={
                      trackedHandlers.handleSdt5xxlChangeWithTracking
                    }
                    onSelectSdt5xxlFile={handleSelectSdt5xxlFile}
                    onSdcliplChange={
                      trackedHandlers.handleSdcliplChangeWithTracking
                    }
                    onSelectSdcliplFile={handleSelectSdcliplFile}
                    onSdclipgChange={
                      trackedHandlers.handleSdclipgChangeWithTracking
                    }
                    onSelectSdclipgFile={handleSelectSdclipgFile}
                    onSdphotomakerChange={
                      trackedHandlers.handleSdphotomakerChangeWithTracking
                    }
                    onSelectSdphotomakerFile={handleSelectSdphotomakerFile}
                    onSdvaeChange={
                      trackedHandlers.handleSdvaeChangeWithTracking
                    }
                    onSelectSdvaeFile={handleSelectSdvaeFile}
                    onSdloraChange={
                      trackedHandlers.handleSdloraChangeWithTracking
                    }
                    onSelectSdloraFile={handleSelectSdloraFile}
                    onApplyPreset={handleApplyPreset}
                  />
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
