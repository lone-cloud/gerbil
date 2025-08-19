import { useState, useEffect } from 'react';
import { AppShell, Loader, Center, Stack, Text } from '@mantine/core';
import { DownloadScreen } from '@/components/screens/Download';
import { LaunchScreen } from '@/components/screens/Launch';
import { InterfaceScreen } from '@/components/screens/Interface';
import { UpdateDialog } from '@/components/UpdateDialog';
import { UpdateAvailableModal } from '@/components/UpdateAvailableModal';
import { SettingsModal } from '@/components/settings/SettingsModal';
import { ScreenTransition } from '@/components/ScreenTransition';
import { AppHeader } from '@/components/AppHeader';
import { useUpdateChecker } from '@/hooks/useUpdateChecker';
import { useKoboldVersions } from '@/hooks/useKoboldVersions';
import { UI } from '@/constants';
import type { UpdateInfo } from '@/types';
import type { DownloadItem } from '@/types/electron';

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
  }, [checkForUpdates]);

  const handleBinaryUpdate = async (download: DownloadItem) => {
    try {
      const downloadType = download.type === 'rocm' ? 'rocm' : 'asset';
      const success = await sharedHandleDownload(
        downloadType,
        download,
        true,
        true
      );

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
      </AppShell>
    </>
  );
};
