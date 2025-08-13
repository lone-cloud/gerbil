import { useState, useEffect, ReactNode } from 'react';
import {
  AppShell,
  Group,
  ActionIcon,
  Tooltip,
  rem,
  Transition,
  Loader,
  Center,
  Stack,
  Text,
  Button,
  useMantineColorScheme,
} from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { Settings, ArrowLeft } from 'lucide-react';
import { DownloadScreen } from '@/screens/DownloadScreen';
import { LaunchScreen } from '@/screens/LaunchScreen';
import { TerminalScreen } from '@/screens/TerminalScreen';
import { UpdateDialog } from '@/components/UpdateDialog';
import { SettingsModal } from '@/components/SettingsModal';
import { useNotifications } from '@/hooks/useNotifications';
import type { UpdateInfo } from '@/types';

type Screen = 'download' | 'launch' | 'terminal';

interface ScreenTransitionProps {
  isActive: boolean;
  shouldAnimate: boolean;
  children: ReactNode;
}

const ScreenTransition = ({
  isActive,
  shouldAnimate,
  children,
}: ScreenTransitionProps) => {
  const getTransform = () => {
    if (!shouldAnimate) return undefined;
    const scale = isActive ? 1 : 0.98;
    return `scale(${scale})`;
  };

  return (
    <Transition
      mounted={isActive}
      transition="fade"
      duration={shouldAnimate ? 350 : 0}
      timingFunction="ease-out"
    >
      {(styles) => (
        <div
          style={{
            ...styles,
            position: isActive ? 'static' : 'absolute',
            width: '100%',
            top: 0,
            left: 0,
            zIndex: isActive ? 1 : 0,
            transform: `${styles.transform || ''} ${getTransform() || ''}`,
            transition: shouldAnimate ? 'all 350ms ease-out' : undefined,
          }}
        >
          {children}
        </div>
      )}
    </Transition>
  );
};

export const App = () => {
  const [currentScreen, setCurrentScreen] = useState<Screen | null>(null);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);
  const [settingsOpened, setSettingsOpened] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);
  const { colorScheme } = useMantineColorScheme();
  const notify = useNotifications();

  useEffect(() => {
    const checkInstallation = async () => {
      if (window.electronAPI) {
        try {
          const installed = await window.electronAPI.kobold.isInstalled();
          setCurrentScreen(installed ? 'launch' : 'download');
          setHasInitialized(true);
        } catch (error) {
          console.error('Error checking installation:', error);
          setHasInitialized(true);
        }
      } else {
        setHasInitialized(true);
      }
    };

    checkInstallation();

    if (window.electronAPI) {
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
    }
  }, []);

  const handleDownloadComplete = () => {
    notify.success(
      'Download Complete',
      'KoboldCpp has been successfully installed'
    );
    setTimeout(() => {
      setCurrentScreen('launch');
    }, 100);
  };

  const handleLaunch = () => {
    setCurrentScreen('terminal');
    notify.success('Launch Started', 'KoboldCpp is starting up...');
  };

  const handleBackToLaunch = () => {
    setCurrentScreen('launch');
  };

  const handleEject = async () => {
    // Show confirmation dialog
    try {
      const confirmed = await window.electronAPI.kobold.confirmEject();
      if (!confirmed) {
        return; // User cancelled
      }
    } catch (error) {
      console.error('Error showing confirmation dialog:', error);
      return;
    }

    if (window.electronAPI?.kobold?.stopKoboldCpp) {
      try {
        await window.electronAPI.kobold.stopKoboldCpp();
      } catch (error) {
        console.error('Error stopping KoboldCpp:', error);
        notify.error('Stop Failed', 'Failed to stop KoboldCpp process');
      }
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
      <Notifications
        position="bottom-right"
        zIndex={1000}
        containerWidth={320}
      />
      <AppShell header={{ height: 60 }} padding="md">
        <AppShell.Header
          style={{
            borderBottom: `1px solid var(--mantine-color-${colorScheme === 'dark' ? 'dark-4' : 'gray-3'})`,
            backdropFilter: 'blur(10px)',
            background:
              colorScheme === 'dark'
                ? 'rgba(26, 27, 30, 0.8)'
                : 'rgba(255, 255, 255, 0.8)',
            transition: 'all 200ms ease',
          }}
        >
          <Group h="100%" px="md" justify="space-between">
            {currentScreen === 'terminal' && (
              <Button
                variant="light"
                color="red"
                leftSection={<ArrowLeft size={16} />}
                onClick={handleEject}
              >
                Eject
              </Button>
            )}

            <Group ml="auto">
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
            </Group>
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
                isActive={currentScreen === 'terminal'}
                shouldAnimate={hasInitialized}
              >
                <TerminalScreen />
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
