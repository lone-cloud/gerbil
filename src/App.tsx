import { useState, useEffect } from 'react';
import {
  AppShell,
  Group,
  ActionIcon,
  Tooltip,
  rem,
  Loader,
  Center,
  Stack,
  Text,
  Button,
  Select,
  useMantineColorScheme,
} from '@mantine/core';
import { Settings, ArrowLeft } from 'lucide-react';
import { DownloadScreen } from '@/components/screens/DownloadScreen';
import { LaunchScreen } from '@/components/screens/LaunchScreen';
import { InterfaceScreen } from '@/components/screens/InterfaceScreen';
import { UpdateDialog } from '@/components/UpdateDialog';
import { SettingsModal } from '@/components/SettingsModal';
import { ScreenTransition } from '@/components/ScreenTransition';
import type { UpdateInfo } from '@/types';

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
  const { colorScheme } = useMantineColorScheme();

  useEffect(() => {
    const checkInstallation = async () => {
      try {
        const startTime = Date.now();
        const installedVersions =
          await window.electronAPI.kobold.getInstalledVersions(false);

        const elapsed = Date.now() - startTime;
        const minDelay = 500;
        if (elapsed < minDelay) {
          await new Promise((resolve) =>
            setTimeout(resolve, minDelay - elapsed)
          );
        }

        setCurrentScreen(installedVersions.length > 0 ? 'launch' : 'download');
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

    return () => {
      window.electronAPI.kobold.removeAllListeners('update-available');
      cleanupInstallDirListener();
    };
  }, []);

  const handleDownloadComplete = () => {
    setTimeout(() => {
      setCurrentScreen('launch');
    }, 100);
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
                  { value: 'chat', label: 'KoboldAI Lite' },
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

            <div
              style={{
                minWidth: '100px',
                display: 'flex',
                justifyContent: 'flex-end',
              }}
            >
              <Tooltip label="Settings" position="bottom">
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
              </Tooltip>
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
                  Initializing...
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
                <LaunchScreen onLaunch={handleLaunch} />
              </ScreenTransition>

              <ScreenTransition
                isActive={currentScreen === 'interface'}
                shouldAnimate={hasInitialized}
              >
                <InterfaceScreen
                  activeTab={activeInterfaceTab}
                  onTabChange={setActiveInterfaceTab}
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
        />
      </AppShell>
    </>
  );
};
