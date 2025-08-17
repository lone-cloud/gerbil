import {
  Card,
  Container,
  Stack,
  Tabs,
  Text,
  Title,
  Group,
  Button,
  Select,
  Modal,
  TextInput,
  Badge,
} from '@mantine/core';
import {
  useState,
  useEffect,
  useCallback,
  forwardRef,
  type ComponentPropsWithoutRef,
} from 'react';
import { Save, File, Plus } from 'lucide-react';
import { useLaunchConfig } from '@/hooks/useLaunchConfig';
import { useChangeTracker } from '@/hooks/useChangeTracker';
import { GeneralTab } from '@/screens/Launch/GeneralTab';
import { AdvancedTab } from '@/screens/Launch/AdvancedTab';
import { NetworkTab } from '@/screens/Launch/NetworkTab';
import { ImageGenerationTab } from '@/screens/Launch/ImageGenerationTab';
import { WarningDisplay } from '@/components/WarningDisplay';
import type { ConfigFile } from '@/types';

interface LaunchScreenProps {
  onLaunch: () => void;
  onLaunchModeChange?: (isImageMode: boolean) => void;
}

interface SelectItemProps extends ComponentPropsWithoutRef<'div'> {
  label: string;
  extension: string;
}

const getBadgeColor = (extension: string) => {
  switch (extension.toLowerCase()) {
    case '.kcpps':
      return 'blue';
    case '.kcppt':
      return 'green';
    default:
      return 'gray';
  }
};

const SelectItem = forwardRef<HTMLDivElement, SelectItemProps>(
  ({ label, extension, ...others }, ref) => (
    <div ref={ref} {...others}>
      <Group justify="space-between" wrap="nowrap">
        <Text size="sm" truncate>
          {label}
        </Text>
        <Badge size="xs" variant="light" color={getBadgeColor(extension)}>
          {extension}
        </Badge>
      </Group>
    </div>
  )
);

SelectItem.displayName = 'SelectItem';

export const LaunchScreen = ({
  onLaunch,
  onLaunchModeChange,
}: LaunchScreenProps) => {
  const [configFiles, setConfigFiles] = useState<ConfigFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [, setInstallDir] = useState<string>('');
  const [isLaunching, setIsLaunching] = useState(false);
  const [activeTab, setActiveTab] = useState<string | null>('general');
  const [saveAsModalOpened, setSaveAsModalOpened] = useState(false);
  const [newConfigName, setNewConfigName] = useState('');
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
    handleNoavx2Change,
    handleFailsafeChange,
    handleLowvramChange,
    handleQuantmatmulChange,
    handleBackendChange,
    handleGpuDeviceChange,
    handleSdmodelChange,
    handleSelectSdmodelFile,
    handleSdt5xxlChange,
    handleSelectSdt5xxlFile,
    handleSdcliplChange,
    handleSelectSdcliplFile,
    handleSdclipgChange,
    handleSelectSdclipgFile,
    handleSdphotomakerChange,
    handleSelectSdphotomakerFile,
    handleSdvaeChange,
    handleSelectSdvaeFile,
    handleSdloraChange,
    handleSelectSdloraFile,
    handleApplyPreset,
  } = useLaunchConfig();

  const createChangeTracker = useChangeTracker;

  const handleModelPathChangeWithTracking = createChangeTracker(
    handleModelPathChange,
    setHasUnsavedChanges
  );
  const handleGpuLayersChangeWithTracking = createChangeTracker(
    handleGpuLayersChange,
    setHasUnsavedChanges
  );
  const handleAutoGpuLayersChangeWithTracking = createChangeTracker(
    handleAutoGpuLayersChange,
    setHasUnsavedChanges
  );
  const handleContextSizeChangeWithTracking = createChangeTracker(
    handleContextSizeChangeWithStep,
    setHasUnsavedChanges
  );
  const handleAdditionalArgumentsChangeWithTracking = createChangeTracker(
    handleAdditionalArgumentsChange,
    setHasUnsavedChanges
  );
  const handlePortChangeWithTracking = createChangeTracker(
    handlePortChange,
    setHasUnsavedChanges
  );
  const handleHostChangeWithTracking = createChangeTracker(
    handleHostChange,
    setHasUnsavedChanges
  );
  const handleNoshiftChangeWithTracking = createChangeTracker(
    handleNoshiftChange,
    setHasUnsavedChanges
  );
  const handleFlashattentionChangeWithTracking = createChangeTracker(
    handleFlashattentionChange,
    setHasUnsavedChanges
  );
  const handleNoavx2ChangeWithTracking = createChangeTracker(
    handleNoavx2Change,
    setHasUnsavedChanges
  );
  const handleFailsafeChangeWithTracking = createChangeTracker(
    handleFailsafeChange,
    setHasUnsavedChanges
  );
  const handleLowvramChangeWithTracking = createChangeTracker(
    handleLowvramChange,
    setHasUnsavedChanges
  );
  const handleQuantmatmulChangeWithTracking = createChangeTracker(
    handleQuantmatmulChange,
    setHasUnsavedChanges
  );
  const handleMultiuserChangeWithTracking = createChangeTracker(
    handleMultiuserChange,
    setHasUnsavedChanges
  );
  const handleMultiplayerChangeWithTracking = createChangeTracker(
    handleMultiplayerChange,
    setHasUnsavedChanges
  );
  const handleRemotetunnelChangeWithTracking = createChangeTracker(
    handleRemotetunnelChange,
    setHasUnsavedChanges
  );
  const handleNocertifyChangeWithTracking = createChangeTracker(
    handleNocertifyChange,
    setHasUnsavedChanges
  );
  const handleWebsearchChangeWithTracking = createChangeTracker(
    handleWebsearchChange,
    setHasUnsavedChanges
  );
  const handleBackendChangeWithTracking = createChangeTracker(
    handleBackendChange,
    setHasUnsavedChanges
  );
  const handleSdmodelChangeWithTracking = createChangeTracker(
    handleSdmodelChange,
    setHasUnsavedChanges
  );
  const handleSdt5xxlChangeWithTracking = createChangeTracker(
    handleSdt5xxlChange,
    setHasUnsavedChanges
  );
  const handleSdcliplChangeWithTracking = createChangeTracker(
    handleSdcliplChange,
    setHasUnsavedChanges
  );
  const handleSdclipgChangeWithTracking = createChangeTracker(
    handleSdclipgChange,
    setHasUnsavedChanges
  );
  const handleSdphotomakerChangeWithTracking = createChangeTracker(
    handleSdphotomakerChange,
    setHasUnsavedChanges
  );
  const handleSdvaeChangeWithTracking = createChangeTracker(
    handleSdvaeChange,
    setHasUnsavedChanges
  );
  const handleSdloraChangeWithTracking = createChangeTracker(
    handleSdloraChange,
    setHasUnsavedChanges
  );

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
    const isImageMode = sdmodel.trim() !== '';
    const isTextMode = modelPath.trim() !== '';

    if (isLaunching || (!isImageMode && !isTextMode)) {
      return;
    }

    setIsLaunching(true);

    try {
      const selectedConfig = selectedFile
        ? configFiles.find((f) => f.name === selectedFile)
        : null;

      const args: string[] = [];

      if (isImageMode && isTextMode) {
        args.push('--sdmodel', sdmodel);
      } else if (isImageMode) {
        args.push('--sdmodel', sdmodel);

        if (sdt5xxl.trim()) {
          args.push('--sdt5xxl', sdt5xxl);
        }

        if (sdclipl.trim()) {
          args.push('--sdclipl', sdclipl);
        }

        if (sdclipg.trim()) {
          args.push('--sdclipg', sdclipg);
        }

        if (sdphotomaker.trim()) {
          args.push('--sdphotomaker', sdphotomaker);
        }

        if (sdvae.trim()) {
          args.push('--sdvae', sdvae);
        }

        if (sdlora.trim()) {
          args.push('--sdlora', sdlora);
        }
      } else {
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

      if (port) {
        args.push('--port', port.toString());
      }

      if (host !== 'localhost' && host) {
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
        if (backend === 'cuda' || backend === 'rocm') {
          const cudaArgs = ['--usecuda'];

          cudaArgs.push(lowvram ? 'lowvram' : 'normal');
          cudaArgs.push(gpuDevice.toString());
          cudaArgs.push(quantmatmul ? 'mmq' : 'nommq');

          args.push(...cudaArgs);
        } else if (backend === 'vulkan') {
          args.push('--usevulkan');
        } else if (backend === 'clblast') {
          args.push('--useclblast');
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
        if (onLaunchModeChange) {
          onLaunchModeChange(isImageMode);
        }

        setTimeout(() => {
          onLaunch();
        }, 100);
      } else {
        window.electronAPI.logs.logError(
          'Launch failed:',
          new Error(result.error)
        );
      }
    } catch (error) {
      window.electronAPI.logs.logError(
        'Error launching KoboldCpp:',
        error as Error
      );
    } finally {
      setIsLaunching(false);
    }
  };

  const hasTextModel = modelPath?.trim() !== '';
  const hasImageModel = sdmodel.trim() !== '';
  const showModelPriorityWarning = hasTextModel && hasImageModel;

  const combinedWarnings = [
    ...warnings,
    ...(showModelPriorityWarning
      ? [
          {
            type: 'warning' as const,
            message:
              'Both text and image generation models are selected. The image generation model will take priority and be used for launch.',
          },
        ]
      : []),
  ];

  return (
    <Container size="sm">
      <Stack gap="md">
        <Card withBorder radius="md" shadow="sm" p="lg">
          <Stack gap="lg">
            <Group justify="space-between" align="center">
              <Title order={3}>Launch Configuration</Title>
              <WarningDisplay warnings={combinedWarnings}>
                <Button
                  radius="md"
                  disabled={(!modelPath && !sdmodel) || isLaunching}
                  onClick={handleLaunch}
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

            <Stack gap="xs">
              <Text fw={500} size="sm">
                Configuration File
              </Text>
              {configFiles.length === 0 ? (
                <Text c="dimmed" size="sm">
                  No configuration files found in the installation directory.
                </Text>
              ) : (
                (() => {
                  const selectData = configFiles.map((file) => {
                    const extension = file.name.split('.').pop() || '';
                    const nameWithoutExtension = file.name.replace(
                      `.${extension}`,
                      ''
                    );

                    return {
                      value: file.name,
                      label: nameWithoutExtension,
                      extension: `.${extension}`,
                    };
                  });

                  return (
                    <Group gap="xs" align="flex-end">
                      <div style={{ flex: 1 }}>
                        <Select
                          placeholder="Select a configuration file"
                          value={selectedFile}
                          onChange={(value: string | null) =>
                            value && handleFileSelection(value)
                          }
                          data={selectData}
                          leftSection={<File size={16} />}
                          searchable
                          clearable={false}
                          renderOption={({ option }) => {
                            const dataItem = selectData.find(
                              (item) => item.value === option.value
                            );
                            const extension = dataItem?.extension || '';
                            return (
                              <SelectItem
                                label={option.label}
                                extension={extension}
                              />
                            );
                          }}
                        />
                      </div>
                      <Button
                        variant="light"
                        leftSection={<Plus size={14} />}
                        size="sm"
                        onClick={() => {
                          setSelectedFile(null);
                          setHasUnsavedChanges(true);
                        }}
                      >
                        New
                      </Button>

                      <Button
                        variant="outline"
                        leftSection={<Save size={14} />}
                        size="sm"
                        disabled={!hasUnsavedChanges}
                        onClick={() => {
                          if (selectedFile) {
                            setHasUnsavedChanges(false);
                          } else {
                            setSaveAsModalOpened(true);
                          }
                        }}
                      >
                        Save
                      </Button>
                    </Group>
                  );
                })()
              )}
            </Stack>

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
                    gpuDevice={gpuDevice}
                    noavx2={noavx2}
                    failsafe={failsafe}
                    onModelPathChange={handleModelPathChangeWithTracking}
                    onSelectModelFile={handleSelectModelFile}
                    onGpuLayersChange={handleGpuLayersChangeWithTracking}
                    onAutoGpuLayersChange={
                      handleAutoGpuLayersChangeWithTracking
                    }
                    onContextSizeChange={handleContextSizeChangeWithTracking}
                    onBackendChange={handleBackendChangeWithTracking}
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
                      handleAdditionalArgumentsChangeWithTracking
                    }
                    onNoshiftChange={handleNoshiftChangeWithTracking}
                    onFlashattentionChange={
                      handleFlashattentionChangeWithTracking
                    }
                    onNoavx2Change={handleNoavx2ChangeWithTracking}
                    onFailsafeChange={handleFailsafeChangeWithTracking}
                    onLowvramChange={handleLowvramChangeWithTracking}
                    onQuantmatmulChange={handleQuantmatmulChangeWithTracking}
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
                  <ImageGenerationTab
                    sdmodel={sdmodel}
                    sdt5xxl={sdt5xxl}
                    sdclipl={sdclipl}
                    sdclipg={sdclipg}
                    sdphotomaker={sdphotomaker}
                    sdvae={sdvae}
                    sdlora={sdlora}
                    onSdmodelChange={handleSdmodelChangeWithTracking}
                    onSelectSdmodelFile={handleSelectSdmodelFile}
                    onSdt5xxlChange={handleSdt5xxlChangeWithTracking}
                    onSelectSdt5xxlFile={handleSelectSdt5xxlFile}
                    onSdcliplChange={handleSdcliplChangeWithTracking}
                    onSelectSdcliplFile={handleSelectSdcliplFile}
                    onSdclipgChange={handleSdclipgChangeWithTracking}
                    onSelectSdclipgFile={handleSelectSdclipgFile}
                    onSdphotomakerChange={handleSdphotomakerChangeWithTracking}
                    onSelectSdphotomakerFile={handleSelectSdphotomakerFile}
                    onSdvaeChange={handleSdvaeChangeWithTracking}
                    onSelectSdvaeFile={handleSelectSdvaeFile}
                    onSdloraChange={handleSdloraChangeWithTracking}
                    onSelectSdloraFile={handleSelectSdloraFile}
                    onApplyPreset={handleApplyPreset}
                  />
                </Tabs.Panel>
              </div>
            </Tabs>
          </Stack>
        </Card>

        <Modal
          opened={saveAsModalOpened}
          onClose={() => setSaveAsModalOpened(false)}
          title="Save Configuration As..."
          size="sm"
        >
          <Stack gap="md">
            <TextInput
              label="Configuration Name"
              placeholder="Enter a name for this configuration"
              value={newConfigName}
              onChange={(event) => setNewConfigName(event.currentTarget.value)}
              data-autofocus
            />
            <Group justify="flex-end" gap="sm">
              <Button
                variant="outline"
                onClick={() => setSaveAsModalOpened(false)}
              >
                Cancel
              </Button>
              <Button
                disabled={!newConfigName.trim()}
                leftSection={<Save size={16} />}
                onClick={() => {
                  setSaveAsModalOpened(false);
                  setNewConfigName('');
                  setHasUnsavedChanges(false);
                }}
              >
                Save As New
              </Button>
            </Group>
          </Stack>
        </Modal>
      </Stack>
    </Container>
  );
};
