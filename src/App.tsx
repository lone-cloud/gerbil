import { useState, useEffect } from 'react';
import {
  AppShell,
  Group,
  ActionIcon,
  rem,
  Loader,
  Center,
  Stack,
  Text,
  Button,
  Select,
  Badge,
  useMantineColorScheme,
} from '@mantine/core';
import { Settings, ArrowLeft } from 'lucide-react';
import { DownloadScreen } from '@/screens/Download';
import { LaunchScreen } from '@/screens/Launch';
import { InterfaceScreen } from '@/screens/Interface';
import { UpdateDialog } from '@/components/UpdateDialog';
import { SettingsModal } from '@/components/settings/SettingsModal';
import { ScreenTransition } from '@/components/ScreenTransition';
import { StyledTooltip } from '@/components/StyledTooltip';
import type { UpdateInfo, InstalledVersion } from '@/types';

type Screen = 'download' | 'launch' | 'interface';

export const App = () => {
  const [currentScreen, setCurrentScreen] = useState<Screen | null>(null);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);
  const [settingsOpened, setSettingsOpened] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [activeInterfaceTab, setActiveInterfaceTab] = useState<string | null>(
    'terminal'
  );
  const [isImageGenerationMode, setIsImageGenerationMode] =
    useState<boolean>(false);
  const [currentVersion, setCurrentVersion] = useState<InstalledVersion | null>(
    null
  );
  const [installedVersions, setInstalledVersions] = useState<
    InstalledVersion[]
  >([]);
  const { colorScheme } = useMantineColorScheme();

  const getDisplayNameFromPath = (
    installedVersion: InstalledVersion
  ): string => {
    const pathParts = installedVersion.path.split(/[/\\]/);
    const launcherIndex = pathParts.findIndex(
      (part) =>
        part === 'koboldcpp-launcher' ||
        part === 'koboldcpp.exe' ||
        part === 'koboldcpp'
    );

    if (launcherIndex > 0) {
      return pathParts[launcherIndex - 1];
    }

    return installedVersion.filename;
  };

  useEffect(() => {
    const checkInstallation = async () => {
      try {
        const [versions, currentBinaryPath] = await Promise.all([
          window.electronAPI.kobold.getInstalledVersions(),
          window.electronAPI.config.get(
            'currentKoboldBinary'
          ) as Promise<string>,
        ]);

        setInstalledVersions(versions);

        if (versions.length > 0) {
          let current = null;
          if (currentBinaryPath) {
            current = versions.find((v) => v.path === currentBinaryPath);
          }
          if (!current) {
            current = versions[0];
            if (current) {
              await window.electronAPI.config.set(
                'currentKoboldBinary',
                current.path
              );
            }
          }
          setCurrentVersion(current);
          setCurrentScreen('launch');
        } else {
          setCurrentScreen('download');
        }

        setHasInitialized(true);
      } catch (error) {
        console.error('Error checking installation:', error);
        setHasInitialized(true);
      }
    };

    checkInstallation();

    window.electronAPI.kobold.onUpdateAvailable((info) => {
      setUpdateInfo(info);
      setShowUpdateDialog(true);
    });

    const cleanupInstallDirListener =
      window.electronAPI.kobold.onInstallDirChanged(() => {
        checkInstallation();
      });

    const cleanupVersionsListener = window.electronAPI.kobold.onVersionsUpdated(
      () => {
        checkInstallation();
      }
    );

    return () => {
      window.electronAPI.kobold.removeAllListeners('update-available');
      cleanupInstallDirListener();
      cleanupVersionsListener();
    };
  }, []);

  const handleDownloadComplete = async () => {
    try {
      const [versions, currentBinaryPath] = await Promise.all([
        window.electronAPI.kobold.getInstalledVersions(),
        window.electronAPI.config.get('currentKoboldBinary') as Promise<string>,
      ]);

      setInstalledVersions(versions);

      if (versions.length > 0) {
        let current = null;
        if (currentBinaryPath) {
          current = versions.find((v) => v.path === currentBinaryPath);
        }
        if (!current) {
          current = versions[0];
          if (current) {
            await window.electronAPI.config.set(
              'currentKoboldBinary',
              current.path
            );
          }
        }
        setCurrentVersion(current);
      }
    } catch (error) {
      console.error('Error refreshing versions after download:', error);
    }

    setTimeout(() => {
      setCurrentScreen('launch');
    }, 100);
  };

  const handleVersionChange = async (versionPath: string | null) => {
    if (!versionPath) return;

    try {
      const success =
        await window.electronAPI.kobold.setCurrentVersion(versionPath);
      if (success) {
        await window.electronAPI.config.set('currentKoboldBinary', versionPath);
        const newCurrent = installedVersions.find(
          (v) => v.path === versionPath
        );
        if (newCurrent) {
          setCurrentVersion(newCurrent);
        }
      }
    } catch (error) {
      console.error('Failed to change version:', error);
    }
  };

  const handleLaunch = () => {
    setCurrentScreen('interface');
  };

  const handleBackToLaunch = () => {
    setCurrentScreen('launch');
  };

  const handleEject = async () => {
    try {
      const confirmed = await window.electronAPI.kobold.confirmEject();
      if (!confirmed) {
        return;
      }
    } catch (error) {
      console.error('Error showing confirmation dialog:', error);
      return;
    }

    try {
      await window.electronAPI.kobold.stopKoboldCpp();
    } catch (error) {
      console.error('Error stopping KoboldCpp:', error);
    }

    handleBackToLaunch();
  };

  const handleUpdateIgnore = () => {
    setShowUpdateDialog(false);
  };

  const handleUpdateAccept = () => {
    setShowUpdateDialog(false);
    setCurrentScreen('download');
  };

  return (
    <>
      <AppShell header={{ height: 60 }} padding="md">
        <AppShell.Header
          style={{
            borderBottom: `1px solid var(--mantine-color-${colorScheme === 'dark' ? 'dark-4' : 'gray-3'})`,
            background:
              colorScheme === 'dark'
                ? 'var(--mantine-color-dark-7)'
                : 'var(--mantine-color-white)',
            transition: 'all 200ms ease',
          }}
        >
          <Group h="100%" px="md" justify="space-between" align="center">
            <div style={{ minWidth: '100px' }}>
              {currentScreen === 'interface' && (
                <Button
                  variant="light"
                  color="red"
                  leftSection={<ArrowLeft size={16} />}
                  onClick={handleEject}
                >
                  Eject
                </Button>
              )}
            </div>

            {currentScreen === 'interface' && (
              <Select
                value={activeInterfaceTab}
                onChange={setActiveInterfaceTab}
                data={[
                  {
                    value: 'chat',
                    label: isImageGenerationMode
                      ? 'Stable UI'
                      : 'KoboldAI Lite',
                  },
                  { value: 'terminal', label: 'Terminal' },
                ]}
                placeholder="Select view"
                styles={{
                  input: {
                    minWidth: '150px',
                    textAlign: 'center',
                    border: 'none',
                    backgroundColor: 'transparent',
                    fontWeight: 500,
                  },
                  dropdown: {
                    minWidth: '150px',
                  },
                }}
              />
            )}

            {currentScreen === 'launch' && currentVersion && (
              <Group gap="xs" align="center">
                <Select
                  value={currentVersion.path}
                  onChange={handleVersionChange}
                  data={installedVersions.map((version) => ({
                    value: version.path,
                    label: getDisplayNameFromPath(version),
                  }))}
                  placeholder="Select version"
                  variant="unstyled"
                  styles={{
                    input: {
                      minWidth: '225px',
                      textAlign: 'center',
                      border: `1px solid var(--mantine-color-${colorScheme === 'dark' ? 'dark-4' : 'gray-4'})`,
                      borderRadius: 'var(--mantine-radius-sm)',
                      backgroundColor:
                        colorScheme === 'dark'
                          ? 'var(--mantine-color-dark-6)'
                          : 'var(--mantine-color-gray-0)',
                      fontWeight: 500,
                      fontSize: '14px',
                      padding: '6px 12px',
                      transition: 'all 200ms ease',
                      '&:hover': {
                        backgroundColor:
                          colorScheme === 'dark'
                            ? 'var(--mantine-color-dark-5)'
                            : 'var(--mantine-color-gray-1)',
                      },
                    },
                    dropdown: {
                      minWidth: '200px',
                    },
                  }}
                />
                <Badge variant="light" color="blue" size="sm">
                  v{currentVersion.version}
                </Badge>
              </Group>
            )}

            <div
              style={{
                minWidth: '100px',
                display: 'flex',
                justifyContent: 'flex-end',
              }}
            >
              <StyledTooltip label="Settings" position="bottom">
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  size="xl"
                  onClick={() => setSettingsOpened(true)}
                  aria-label="Open settings"
                  style={{
                    transition: 'all 200ms ease',
                  }}
                >
                  <Settings style={{ width: rem(20), height: rem(20) }} />
                </ActionIcon>
              </StyledTooltip>
            </div>
          </Group>
        </AppShell.Header>
        <AppShell.Main
          style={{
            position: 'relative',
            overflow: 'hidden',
            minHeight: 'calc(100vh - 60px)',
          }}
        >
          {currentScreen === null ? (
            <Center h="100%" style={{ minHeight: '400px' }}>
              <Stack align="center" gap="lg">
                <Loader size="xl" type="dots" />
                <Text c="dimmed" size="lg">
                  Loading...
                </Text>
              </Stack>
            </Center>
          ) : (
            <>
              <ScreenTransition
                isActive={currentScreen === 'download'}
                shouldAnimate={hasInitialized}
              >
                <DownloadScreen onDownloadComplete={handleDownloadComplete} />
              </ScreenTransition>

              <ScreenTransition
                isActive={currentScreen === 'launch'}
                shouldAnimate={hasInitialized}
              >
                <LaunchScreen
                  onLaunch={handleLaunch}
                  onLaunchModeChange={setIsImageGenerationMode}
                />
              </ScreenTransition>

              <ScreenTransition
                isActive={currentScreen === 'interface'}
                shouldAnimate={hasInitialized}
              >
                <InterfaceScreen
                  activeTab={activeInterfaceTab}
                  onTabChange={setActiveInterfaceTab}
                  isImageGenerationMode={isImageGenerationMode}
                />
              </ScreenTransition>
            </>
          )}

          {showUpdateDialog && updateInfo && (
            <UpdateDialog
              updateInfo={updateInfo}
              onIgnore={handleUpdateIgnore}
              onAccept={handleUpdateAccept}
            />
          )}
        </AppShell.Main>
        <SettingsModal
          opened={settingsOpened}
          onClose={() => setSettingsOpened(false)}
          currentScreen={currentScreen || undefined}
        />
      </AppShell>
    </>
  );
};
