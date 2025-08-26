import { useState, useEffect } from 'react';
import { AppShell, Loader, Center, Stack, Text } from '@mantine/core';
import { DownloadScreen } from '@/components/screens/Download';
import { LaunchScreen } from '@/components/screens/Launch';
import { InterfaceScreen } from '@/components/screens/Interface';
import { WelcomeScreen } from '@/components/screens/Welcome';
import { UpdateAvailableModal } from '@/components/UpdateAvailableModal';
import { SettingsModal } from '@/components/settings/SettingsModal';
import { EjectConfirmModal } from '@/components/EjectConfirmModal';
import { ScreenTransition } from '@/components/ScreenTransition';
import { AppHeader } from '@/components/AppHeader';
import { useUpdateChecker } from '@/hooks/useUpdateChecker';
import { useKoboldVersions } from '@/hooks/useKoboldVersions';
import { UI } from '@/constants';
import type { DownloadItem } from '@/types/electron';
import type { InterfaceTab } from '@/types';

type Screen = 'welcome' | 'download' | 'launch' | 'interface';

export const App = () => {
  const [currentScreen, setCurrentScreen] = useState<Screen | null>(null);
  const [settingsOpened, setSettingsOpened] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [showEjectModal, setShowEjectModal] = useState(false);
  const [activeInterfaceTab, setActiveInterfaceTab] =
    useState<InterfaceTab>('terminal');
  const [isImageGenerationMode, setIsImageGenerationMode] = useState(false);

  const {
    updateInfo: binaryUpdateInfo,
    showUpdateModal,
    checkForUpdates,
    dismissUpdate,
  } = useUpdateChecker();

  const {
    handleDownload: sharedHandleDownload,
    downloading,
    downloadProgress,
  } = useKoboldVersions();

  const setCurrentScreenWithTransition = (screen: Screen) => {
    setCurrentScreen(screen);
  };

  useEffect(() => {
    const checkInstallation = async () => {
      try {
        const [versions, currentBinaryPath, hasSeenWelcome] = await Promise.all(
          [
            window.electronAPI.kobold.getInstalledVersions(),
            window.electronAPI.config.get(
              'currentKoboldBinary'
            ) as Promise<string>,
            window.electronAPI.config.get('hasSeenWelcome') as Promise<boolean>,
          ]
        );

        if (!hasSeenWelcome) {
          setCurrentScreenWithTransition('welcome');
        } else if (versions.length > 0) {
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
          setCurrentScreenWithTransition('launch');
        } else {
          setCurrentScreenWithTransition('download');
        }

        setHasInitialized(true);

        if (versions.length > 0) {
          setTimeout(() => {
            checkForUpdates();
          }, 2000);
        }
      } catch (error) {
        window.electronAPI.logs.logError(
          'Error checking installation:',
          error as Error
        );
        setHasInitialized(true);
      }
    };

    checkInstallation();

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
      cleanupInstallDirListener();
      cleanupVersionsListener();
    };
  }, [checkForUpdates]);

  const handleBinaryUpdate = async (download: DownloadItem) => {
    try {
      const success = await sharedHandleDownload('asset', download, true, true);

      if (success) {
        dismissUpdate();
      }
    } catch (error) {
      window.electronAPI.logs.logError(
        'Failed to update binary:',
        error as Error
      );
    }
  };

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
      setCurrentScreenWithTransition('launch');
    }, 100);
  };

  const handleLaunch = () => {
    setActiveInterfaceTab('terminal');
    setCurrentScreenWithTransition('interface');
  };

  const handleBackToLaunch = () => {
    setCurrentScreenWithTransition('launch');
  };

  const handleEject = async () => {
    const skipEjectConfirmation = await window.electronAPI.config.get(
      'skipEjectConfirmation'
    );

    if (skipEjectConfirmation) {
      performEject();
    } else {
      setShowEjectModal(true);
    }
  };

  const performEject = async () => {
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

  const handleEjectConfirm = async (skipConfirmation: boolean) => {
    if (skipConfirmation) {
      await window.electronAPI.config.set('skipEjectConfirmation', true);
    }
    performEject();
  };

  const handleWelcomeComplete = async () => {
    await window.electronAPI.config.set('hasSeenWelcome', true);

    const versions = await window.electronAPI.kobold.getInstalledVersions();
    if (versions.length > 0) {
      setCurrentScreenWithTransition('launch');
    } else {
      setCurrentScreenWithTransition('download');
    }
  };

  return (
    <>
      <AppShell
        header={{ height: currentScreen === 'welcome' ? 0 : UI.HEADER_HEIGHT }}
        padding={currentScreen === 'interface' ? 0 : 'md'}
      >
        {currentScreen !== 'welcome' && (
          <AppHeader
            currentScreen={currentScreen}
            activeInterfaceTab={activeInterfaceTab}
            setActiveInterfaceTab={setActiveInterfaceTab}
            isImageGenerationMode={isImageGenerationMode}
            onEject={handleEject}
            onSettingsOpen={() => setSettingsOpened(true)}
          />
        )}
        <AppShell.Main
          style={{
            position: 'relative',
            overflow: 'hidden',
            minHeight:
              currentScreen === 'welcome'
                ? '100vh'
                : `calc(100vh - ${UI.HEADER_HEIGHT}px)`,
          }}
        >
          {currentScreen === null ? (
            <Center h="100%" style={{ minHeight: '25rem' }}>
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
                isActive={currentScreen === 'welcome'}
                shouldAnimate={hasInitialized}
              >
                <WelcomeScreen onGetStarted={handleWelcomeComplete} />
              </ScreenTransition>

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

          {showUpdateModal && binaryUpdateInfo && (
            <UpdateAvailableModal
              opened={showUpdateModal}
              onClose={dismissUpdate}
              currentVersion={binaryUpdateInfo.currentVersion}
              availableUpdate={binaryUpdateInfo.availableUpdate}
              onUpdate={handleBinaryUpdate}
              isDownloading={
                downloading === binaryUpdateInfo.availableUpdate.name
              }
              downloadProgress={
                downloadProgress[binaryUpdateInfo.availableUpdate.name] || 0
              }
            />
          )}
        </AppShell.Main>
        <SettingsModal
          opened={settingsOpened}
          onClose={() => setSettingsOpened(false)}
          currentScreen={currentScreen || undefined}
        />
        <EjectConfirmModal
          opened={showEjectModal}
          onClose={() => setShowEjectModal(false)}
          onConfirm={handleEjectConfirm}
        />
      </AppShell>
    </>
  );
};
