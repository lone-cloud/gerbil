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
import { TitleBar } from '@/components/TitleBar';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useUpdateChecker } from '@/hooks/useUpdateChecker';
import { useKoboldVersions } from '@/hooks/useKoboldVersions';
import { useModalStore } from '@/stores/modal';
import { safeExecute } from '@/utils/logger';
import { TITLEBAR_HEIGHT } from '@/constants';
import type { DownloadItem } from '@/types/electron';
import type { InterfaceTab, FrontendPreference, Screen } from '@/types';

export const App = () => {
  const [currentScreen, setCurrentScreen] = useState<Screen | null>(null);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [activeInterfaceTab, setActiveInterfaceTab] =
    useState<InterfaceTab>('terminal');
  const [frontendPreference, setFrontendPreference] =
    useState<FrontendPreference>('koboldcpp');

  const { modals, setModalOpen } = useModalStore();

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
          setCurrentScreenWithTransition('welcome');
        } else if (currentVersion) {
          setCurrentScreenWithTransition('launch');
        } else {
          setCurrentScreenWithTransition('download');
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
      setModalOpen('ejectConfirm', true);
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
      setCurrentScreenWithTransition('launch');
    } else {
      setCurrentScreenWithTransition('download');
    }
  };

  return (
    <AppShell
      header={{ height: TITLEBAR_HEIGHT }}
      padding={currentScreen === 'interface' ? 0 : 'md'}
    >
      <TitleBar
        currentScreen={currentScreen || 'welcome'}
        currentTab={activeInterfaceTab}
        onTabChange={setActiveInterfaceTab}
        onEject={handleEject}
        onOpenSettings={() => setModalOpen('settings', true)}
        frontendPreference={frontendPreference}
      />

      <AppShell.Main>
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
                isActive={currentScreen === 'interface'}
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
      <SettingsModal
        opened={modals.settings}
        onClose={async () => {
          setModalOpen('settings', false);
          const preference = await safeExecute(
            () =>
              window.electronAPI.config.get(
                'frontendPreference'
              ) as Promise<FrontendPreference>,
            'Failed to load frontend preference:'
          );
          setFrontendPreference(preference || 'koboldcpp');
        }}
        currentScreen={currentScreen || undefined}
      />
      <EjectConfirmModal
        opened={modals.ejectConfirm}
        onClose={() => setModalOpen('ejectConfirm', false)}
        onConfirm={handleEjectConfirm}
      />
    </AppShell>
  );
};
