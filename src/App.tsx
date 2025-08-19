import { useState, useEffect } from 'react';
import { AppShell, Loader, Center, Stack, Text } from '@mantine/core';
import { DownloadScreen } from '@/components/screens/Download';
import { LaunchScreen } from '@/components/screens/Launch';
import { InterfaceScreen } from '@/components/screens/Interface';
import { UpdateDialog } from '@/components/UpdateDialog';
import { SettingsModal } from '@/components/settings/SettingsModal';
import { ScreenTransition } from '@/components/ScreenTransition';
import { AppHeader } from '@/components/AppHeader';
import { UI } from '@/constants';
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
  const [isImageGenerationMode, setIsImageGenerationMode] =
    useState<boolean>(false);

  useEffect(() => {
    const checkInstallation = async () => {
      try {
        const [versions, currentBinaryPath] = await Promise.all([
          window.electronAPI.kobold.getInstalledVersions(),
          window.electronAPI.config.get(
            'currentKoboldBinary'
          ) as Promise<string>,
        ]);

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
          setCurrentScreen('launch');
        } else {
          setCurrentScreen('download');
        }

        setHasInitialized(true);
      } catch (error) {
        window.electronAPI.logs.logError(
          'Error checking installation:',
          error as Error
        );
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
      }
    } catch (error) {
      window.electronAPI.logs.logError(
        'Error refreshing versions after download:',
        error as Error
      );
    }

    setTimeout(() => {
      setCurrentScreen('launch');
    }, 100);
  };

  const handleLaunch = () => {
    setActiveInterfaceTab('terminal');
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
      window.electronAPI.logs.logError(
        'Error showing confirmation dialog:',
        error as Error
      );
      return;
    }

    try {
      await window.electronAPI.kobold.stopKoboldCpp();
    } catch (error) {
      window.electronAPI.logs.logError(
        'Error stopping KoboldCpp:',
        error as Error
      );
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
      <AppShell
        header={{ height: UI.HEADER_HEIGHT }}
        padding={currentScreen === 'interface' ? 0 : 'md'}
      >
        <AppHeader
          currentScreen={currentScreen}
          activeInterfaceTab={activeInterfaceTab}
          setActiveInterfaceTab={setActiveInterfaceTab}
          isImageGenerationMode={isImageGenerationMode}
          onEject={handleEject}
          onSettingsOpen={() => setSettingsOpened(true)}
        />
        <AppShell.Main
          style={{
            position: 'relative',
            overflow: 'hidden',
            minHeight: `calc(100vh - ${UI.HEADER_HEIGHT}px)`,
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
