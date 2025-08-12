import { useState, useEffect } from 'react';
import { AppShell, Group, ActionIcon, Tooltip, rem } from '@mantine/core';
import { IconSettings } from '@tabler/icons-react';
import { DownloadScreen } from '@/screens/DownloadScreen';
import { LaunchScreen } from '@/screens/LaunchScreen';
import { UpdateDialog } from '@/components/UpdateDialog';
import { SettingsModal } from '@/components/SettingsModal';
import type { UpdateInfo } from '@/types/electron';

type Screen = 'download' | 'launch';

export const App = () => {
  const [currentScreen, setCurrentScreen] = useState<Screen>('download');
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);
  const [settingsOpened, setSettingsOpened] = useState(false);

  useEffect(() => {
    const checkInstallation = async () => {
      if (window.electronAPI) {
        try {
          const installed = await window.electronAPI.kobold.isInstalled();
          setCurrentScreen(installed ? 'launch' : 'download');
        } catch (error) {
          console.error('Error checking installation:', error);
        }
      }
    };

    checkInstallation();

    if (window.electronAPI) {
      window.electronAPI.kobold.onUpdateAvailable((info) => {
        setUpdateInfo(info);
        setShowUpdateDialog(true);
      });
    }

    return () => {
      if (window.electronAPI) {
        window.electronAPI.kobold.removeAllListeners('update-available');
      }
    };
  }, []);

  const handleInstallComplete = () => {
    setCurrentScreen('launch');
  };

  const handleUpdateIgnore = () => {
    setShowUpdateDialog(false);
  };

  const handleUpdateAccept = () => {
    setShowUpdateDialog(false);
    setCurrentScreen('download');
  };

  return (
    <AppShell header={{ height: 60 }} padding="md">
      <AppShell.Header>
        <Group h="100%" px="md" justify="flex-end">
          <Tooltip label="Settings" position="bottom">
            <ActionIcon
              variant="subtle"
              size="lg"
              onClick={() => setSettingsOpened(true)}
              aria-label="Open settings"
            >
              <IconSettings style={{ width: rem(18), height: rem(18) }} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </AppShell.Header>

      <AppShell.Main>
        {currentScreen === 'download' && (
          <DownloadScreen onInstallComplete={handleInstallComplete} />
        )}
        {currentScreen === 'launch' && <LaunchScreen />}

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
  );
};
