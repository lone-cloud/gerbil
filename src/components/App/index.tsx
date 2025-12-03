import { useState, useEffect, useMemo } from 'react';
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
import { BackendCrashModal } from '@/components/App/BackendCrashModal';
import { TitleBar } from '@/components/App/TitleBar';
import { StatusBar } from '@/components/App/StatusBar';
import { ErrorBoundary } from '@/components/App/ErrorBoundary';
import { AppRouter } from '@/components/App/Router';
import { NotepadContainer } from '@/components/Notepad/Container';
import { useUpdateChecker } from '@/hooks/useUpdateChecker';
import { useKoboldBackendsStore } from '@/stores/koboldBackends';
import { usePreferencesStore } from '@/stores/preferences';
import { useLaunchConfigStore } from '@/stores/launchConfig';
import { getDefaultInterfaceTab } from '@/utils/interface';
import { STATUSBAR_HEIGHT, TITLEBAR_HEIGHT } from '@/constants';
import type { DownloadItem } from '@/types/electron';
import type { InterfaceTab, Screen } from '@/types';
import type { KoboldCrashInfo } from '@/types/ipc';

export const App = () => {
  const [currentScreen, setCurrentScreen] = useState<Screen | null>(null);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [activeInterfaceTab, setActiveInterfaceTab] =
    useState<InterfaceTab>('terminal');
  const [isServerReady, setIsServerReady] = useState(false);
  const [ejectConfirmModalOpen, setEjectConfirmModalOpen] = useState(false);
  const [crashInfo, setCrashInfo] = useState<KoboldCrashInfo | null>(null);
  const isInterfaceScreen = currentScreen === 'interface';

  const {
    resolvedColorScheme: appColorScheme,
    systemMonitoringEnabled,
    frontendPreference,
    imageGenerationFrontendPreference,
  } = usePreferencesStore();
  const { setColorScheme } = useMantineColorScheme();
  const { model, sdmodel, isTextMode, isImageGenerationMode } =
    useLaunchConfigStore();

  const defaultInterfaceTab = useMemo(
    () =>
      getDefaultInterfaceTab({
        frontendPreference,
        imageGenerationFrontendPreference,
        isTextMode,
        isImageGenerationMode,
      }),
    [
      frontendPreference,
      imageGenerationFrontendPreference,
      isTextMode,
      isImageGenerationMode,
    ]
  );

  useEffect(() => {
    const cleanup = window.electronAPI.kobold.onServerReady(() => {
      setTimeout(() => {
        setIsServerReady(true);
        setActiveInterfaceTab(defaultInterfaceTab);
      }, 1000);
    });

    return cleanup;
  }, [defaultInterfaceTab]);

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
    setIsServerReady(false);
    setActiveInterfaceTab('terminal');
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

  useEffect(() => {
    const crashCleanup = window.electronAPI.kobold.onKoboldCrashed(
      (crashData) => {
        setCrashInfo(crashData);
      }
    );

    return () => {
      crashCleanup();
    };
  }, []);

  const {
    updateInfo: binaryUpdateInfo,
    showUpdateModal,
    checkForUpdates,
    skipUpdate,
    closeModal,
  } = useUpdateChecker();

  const { handleDownload, loadingRemote } = useKoboldBackendsStore();

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
      const [currentBackend, hasSeenWelcome] = await Promise.all([
        window.electronAPI.kobold.getCurrentBackend(),
        window.electronAPI.config.get('hasSeenWelcome') as Promise<boolean>,
      ]);

      determineScreen(currentBackend, hasSeenWelcome);
      setHasInitialized(true);
    };

    checkInstallation();
  }, []);

  useEffect(() => {
    const runUpdateCheck = async () => {
      if (loadingRemote || !hasInitialized) return;

      const currentBackend =
        await window.electronAPI.kobold.getCurrentBackend();
      if (currentBackend) {
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
    const currentBackend = await window.electronAPI.kobold.getCurrentBackend();

    await handleDownload({
      item: download,
      isUpdate: true,
      wasCurrentBinary: true,
      oldBackendPath: currentBackend?.path,
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

    const currentBackend = await window.electronAPI.kobold.getCurrentBackend();
    determineScreen(currentBackend, true);
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
              isServerReady={isServerReady}
              onWelcomeComplete={handleWelcomeComplete}
              onDownloadComplete={handleDownloadComplete}
              onLaunch={handleLaunch}
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

      <BackendCrashModal
        opened={crashInfo !== null}
        onClose={() => setCrashInfo(null)}
        crashInfo={crashInfo}
      />

      <NotepadContainer />
    </AppShell>
  );
};
