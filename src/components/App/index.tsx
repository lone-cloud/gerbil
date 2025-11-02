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
import { NotepadContainer } from '@/components/Notepad/Container';
import { useUpdateChecker } from '@/hooks/useUpdateChecker';
import { useKoboldVersionsStore } from '@/stores/koboldVersions';
import { usePreferencesStore } from '@/stores/preferences';
import { useLaunchConfigStore } from '@/stores/launchConfig';
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

  const { resolvedColorScheme: appColorScheme, systemMonitoringEnabled } =
    usePreferencesStore();
  const { setColorScheme } = useMantineColorScheme();
  const { model, sdmodel } = useLaunchConfigStore();

  useEffect(() => {
    setColorScheme(appColorScheme);
  }, [appColorScheme, setColorScheme]);

  useEffect(() => {
    const updateTray = async () => {
      const config = await window.electronAPI.kobold.getSelectedConfig();
      const displayModel = model || sdmodel || null;
      const modelName = displayModel
        ? displayModel.split('/').pop() || displayModel
        : null;

      window.electronAPI.app.updateTrayState({
        screen: currentScreen,
        model: modelName,
        config: config || null,
        monitoringEnabled: systemMonitoringEnabled,
      });
    };

    void updateTray();
  }, [currentScreen, model, sdmodel, systemMonitoringEnabled]);

  const performEject = () => {
    window.electronAPI.kobold.stopKoboldCpp();
    setCurrentScreen('launch');
  };

  useEffect(() => {
    const ejectCleanup = window.electronAPI.app.onTrayEject(() => {
      performEject();
    });

    return () => {
      ejectCleanup();
    };
  }, []);

  const {
    updateInfo: binaryUpdateInfo,
    showUpdateModal,
    checkForUpdates,
    skipUpdate,
    closeModal,
  } = useUpdateChecker();

  const { handleDownload, loadingRemote } = useKoboldVersionsStore();

  const determineScreen = (
    currentVersion: unknown,
    hasSeenWelcome: boolean
  ) => {
    if (!hasSeenWelcome) {
      setCurrentScreen('welcome');
    } else if (currentVersion) {
      setCurrentScreen('launch');
    } else {
      setCurrentScreen('download');
    }
  };

  useEffect(() => {
    const checkInstallation = async () => {
      const [currentVersion, hasSeenWelcome] = await Promise.all([
        window.electronAPI.kobold.getCurrentVersion(),
        window.electronAPI.config.get('hasSeenWelcome') as Promise<boolean>,
      ]);

      determineScreen(currentVersion, hasSeenWelcome);
      setHasInitialized(true);
    };

    checkInstallation();
  }, []);

  useEffect(() => {
    const runUpdateCheck = async () => {
      if (loadingRemote || !hasInitialized) return;

      const currentVersion =
        await window.electronAPI.kobold.getCurrentVersion();
      if (currentVersion) {
        setTimeout(() => {
          checkForUpdates();
        }, 5000);

        const interval = setInterval(
          () => {
            checkForUpdates();
          },
          6 * 60 * 60 * 1000
        );

        return () => clearInterval(interval);
      }
    };

    runUpdateCheck();
  }, [loadingRemote, hasInitialized, checkForUpdates]);

  const handleBinaryUpdate = async (download: DownloadItem) => {
    const currentVersion = await window.electronAPI.kobold.getCurrentVersion();

    await handleDownload({
      item: download,
      isUpdate: true,
      wasCurrentBinary: true,
      oldVersionPath: currentVersion?.path,
    });

    closeModal();
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

  const handleEjectConfirm = (skipConfirmation: boolean) => {
    if (skipConfirmation) {
      window.electronAPI.config.set('skipEjectConfirmation', true);
    }
    performEject();
  };

  const handleWelcomeComplete = async () => {
    window.electronAPI.config.set('hasSeenWelcome', true);

    const currentVersion = await window.electronAPI.kobold.getCurrentVersion();
    determineScreen(currentVersion, true);
  };

  const handleDownloadComplete = () => setCurrentScreen('launch');
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
          onClose={closeModal}
          onSkip={skipUpdate}
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

      <NotepadContainer />
    </AppShell>
  );
};
