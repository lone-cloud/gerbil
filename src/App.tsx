import { useState, useEffect } from 'react';
import { AppShell, Loader, Center, Stack, Text } from '@mantine/core';
import { DownloadScreen } from '@/components/screens/Download';
import { LaunchScreen } from '@/components/screens/Launch';
import { InterfaceScreen } from '@/components/screens/Interface';
import { WelcomeScreen } from '@/components/screens/Welcome';
import { UpdateAvailableModal } from '@/components/UpdateAvailableModal';
import { EjectConfirmModal } from '@/components/EjectConfirmModal';
import { ScreenTransition } from '@/components/ScreenTransition';
import { TitleBar } from '@/components/TitleBar';
import { StatusBar } from '@/components/StatusBar';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useUpdateChecker } from '@/hooks/useUpdateChecker';
import { useKoboldVersions } from '@/hooks/useKoboldVersions';
import { safeExecute } from '@/utils/logger';
import { STATUSBAR_HEIGHT, TITLEBAR_HEIGHT } from '@/constants';
import type { DownloadItem } from '@/types/electron';
import type { InterfaceTab, FrontendPreference, Screen } from '@/types';

export const App = () => {
  const [currentScreen, setCurrentScreen] = useState<Screen | null>(null);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [activeInterfaceTab, setActiveInterfaceTab] =
    useState<InterfaceTab>('terminal');
  const [frontendPreference, setFrontendPreference] =
    useState<FrontendPreference>('koboldcpp');
  const [ejectConfirmModalOpen, setEjectConfirmModalOpen] = useState(false);
  const isInterfaceScreen = currentScreen === 'interface';

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
      await safeExecute(async () => {
        const [currentVersion, hasSeenWelcome, preference] = await Promise.all([
          window.electronAPI.kobold.getCurrentVersion(),
          window.electronAPI.config.get('hasSeenWelcome') as Promise<boolean>,
          window.electronAPI.config.get(
            'frontendPreference'
          ) as Promise<FrontendPreference>,
        ]);

        setFrontendPreference(preference || 'koboldcpp');

        if (!hasSeenWelcome) {
          setCurrentScreen('welcome');
        } else if (currentVersion) {
          setCurrentScreen('launch');
        } else {
          setCurrentScreen('download');
        }

        if (currentVersion) {
          setTimeout(() => {
            checkForUpdates();
          }, 2000);
        }
      }, 'Error checking installation:');

      setHasInitialized(true);
    };

    checkInstallation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleBinaryUpdate = async (download: DownloadItem) => {
    await safeExecute(async () => {
      const success = await sharedHandleDownload({
        item: download,
        isUpdate: true,
        wasCurrentBinary: true,
      });

      if (success) {
        dismissUpdate();
      }
    }, 'Failed to update binary:');
  };

  const handleDownloadComplete = async () => {
    await safeExecute(async () => {
      await window.electronAPI.kobold.getCurrentVersion();
    }, 'Error refreshing versions after download:');

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
    const skipEjectConfirmation = await window.electronAPI.config.get(
      'skipEjectConfirmation'
    );

    if (skipEjectConfirmation) {
      performEject();
    } else {
      setEjectConfirmModalOpen(true);
    }
  };

  const performEject = () => {
    window.electronAPI.kobold.stopKoboldCpp();
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
      setCurrentScreen('launch');
    } else {
      setCurrentScreen('download');
    }
  };

  return (
    <AppShell
      header={{ height: TITLEBAR_HEIGHT }}
      footer={{ height: STATUSBAR_HEIGHT }}
      padding={isInterfaceScreen ? 0 : 'md'}
    >
      <TitleBar
        currentScreen={currentScreen || 'welcome'}
        currentTab={activeInterfaceTab}
        onTabChange={setActiveInterfaceTab}
        onEject={handleEject}
        frontendPreference={frontendPreference}
        onFrontendPreferenceChange={setFrontendPreference}
      />

      <AppShell.Main
        top={TITLEBAR_HEIGHT}
        style={{
          height: `calc(100vh - ${TITLEBAR_HEIGHT} - ${STATUSBAR_HEIGHT})`,
          minHeight: `calc(100vh - ${TITLEBAR_HEIGHT} - ${STATUSBAR_HEIGHT})`,
          position: 'relative',
          overflow: 'auto',
          paddingTop: 0,
          top: TITLEBAR_HEIGHT,
          paddingBottom: isInterfaceScreen ? 0 : '1rem',
        }}
      >
        <ErrorBoundary>
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
                <LaunchScreen onLaunch={handleLaunch} />
              </ScreenTransition>

              <ScreenTransition
                isActive={isInterfaceScreen}
                shouldAnimate={hasInitialized}
              >
                <InterfaceScreen
                  activeTab={activeInterfaceTab}
                  onTabChange={setActiveInterfaceTab}
                  frontendPreference={frontendPreference}
                />
              </ScreenTransition>
            </>
          )}
        </ErrorBoundary>

        <UpdateAvailableModal
          opened={showUpdateModal && !!binaryUpdateInfo}
          onClose={dismissUpdate}
          currentVersion={binaryUpdateInfo?.currentVersion}
          availableUpdate={binaryUpdateInfo?.availableUpdate}
          onUpdate={handleBinaryUpdate}
          isDownloading={downloading === binaryUpdateInfo?.availableUpdate.name}
          downloadProgress={
            binaryUpdateInfo
              ? downloadProgress[binaryUpdateInfo.availableUpdate.name] || 0
              : 0
          }
        />
      </AppShell.Main>

      <AppShell.Footer>
        <StatusBar />
      </AppShell.Footer>

      <EjectConfirmModal
        opened={ejectConfirmModalOpen}
        onClose={() => setEjectConfirmModalOpen(false)}
        onConfirm={handleEjectConfirm}
      />
    </AppShell>
  );
};
