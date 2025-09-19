import { useState, useEffect } from 'react';
import {
  AppShell,
  Loader,
  Center,
  Stack,
  Text,
  useMantineColorScheme,
} from '@mantine/core';
import { UpdateAvailableModal } from '@/components/App/UpdateAvailableModal';
import { EjectConfirmModal } from '@/components/App/EjectConfirmModal';
import { TitleBar } from '@/components/App/TitleBar';
import { StatusBar } from '@/components/App/StatusBar';
import { ErrorBoundary } from '@/components/App/ErrorBoundary';
import { AppRouter } from '@/components/App/Router';
import { useUpdateChecker } from '@/hooks/useUpdateChecker';
import { useKoboldVersions } from '@/hooks/useKoboldVersions';
import { usePreferencesStore } from '@/stores/preferences';
import { STATUSBAR_HEIGHT, TITLEBAR_HEIGHT } from '@/constants';
import type { DownloadItem } from '@/types/electron';
import type { InterfaceTab, Screen } from '@/types';

export const App = () => {
  const [currentScreen, setCurrentScreen] = useState<Screen | null>(null);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [activeInterfaceTab, setActiveInterfaceTab] =
    useState<InterfaceTab>('terminal');
  const [ejectConfirmModalOpen, setEjectConfirmModalOpen] = useState(false);
  const isInterfaceScreen = currentScreen === 'interface';

  const { resolvedColorScheme: appColorScheme } = usePreferencesStore();
  const { setColorScheme } = useMantineColorScheme();

  useEffect(() => {
    setColorScheme(appColorScheme);
  }, [appColorScheme, setColorScheme]);

  const {
    updateInfo: binaryUpdateInfo,
    showUpdateModal,
    checkForUpdates,
    dismissUpdate,
  } = useUpdateChecker();

  const { handleDownload: sharedHandleDownload } = useKoboldVersions();

  useEffect(() => {
    const checkInstallation = async () => {
      const [currentVersion, hasSeenWelcome] = await Promise.all([
        window.electronAPI.kobold.getCurrentVersion(),
        window.electronAPI.config.get('hasSeenWelcome') as Promise<boolean>,
      ]);

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

      setHasInitialized(true);
    };

    checkInstallation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleBinaryUpdate = async (download: DownloadItem) => {
    const success = await sharedHandleDownload({
      item: download,
      isUpdate: true,
      wasCurrentBinary: true,
    });

    if (success) {
      dismissUpdate();
    }
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
    setCurrentScreen('launch');
  };

  const handleEjectConfirm = (skipConfirmation: boolean) => {
    if (skipConfirmation) {
      window.electronAPI.config.set('skipEjectConfirmation', true);
    }
    performEject();
  };

  const handleWelcomeComplete = () => {
    setCurrentScreen('download');
  };

  const handleDownloadComplete = () => {
    setTimeout(() => setCurrentScreen('launch'), 500);
  };

  const handleLaunch = () => {
    setActiveInterfaceTab('terminal');
    setCurrentScreen('interface');
  };

  return (
    <AppShell
      header={{ height: TITLEBAR_HEIGHT }}
      footer={{ height: STATUSBAR_HEIGHT }}
      padding={isInterfaceScreen ? 0 : 'md'}
    >
      <TitleBar
        currentScreen={currentScreen || 'launch'}
        currentTab={activeInterfaceTab}
        onEject={handleEject}
        onTabChange={setActiveInterfaceTab}
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
            <AppRouter
              currentScreen={currentScreen}
              hasInitialized={hasInitialized}
              activeInterfaceTab={activeInterfaceTab}
              onWelcomeComplete={handleWelcomeComplete}
              onDownloadComplete={handleDownloadComplete}
              onLaunch={handleLaunch}
              onTabChange={setActiveInterfaceTab}
            />
          )}
        </ErrorBoundary>

        <UpdateAvailableModal
          opened={showUpdateModal && !!binaryUpdateInfo}
          onClose={dismissUpdate}
          updateInfo={binaryUpdateInfo || undefined}
          onUpdate={handleBinaryUpdate}
        />
      </AppShell.Main>

      <StatusBar />

      <EjectConfirmModal
        opened={ejectConfirmModalOpen}
        onClose={() => setEjectConfirmModalOpen(false)}
        onConfirm={handleEjectConfirm}
      />
    </AppShell>
  );
};
