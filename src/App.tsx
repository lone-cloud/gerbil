import { useState, useEffect } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
} from 'react-router-dom';
import { AppShell, Group } from '@mantine/core';
import { DownloadScreen } from '@/components/DownloadScreen';
import { LaunchScreen } from '@/components/LaunchScreen';
import { UpdateDialog } from '@/components/UpdateDialog';
import { SettingsButton } from '@/components/SettingsModal';
import type { UpdateInfo } from '@/types/electron';

const AppContent = () => {
  const navigate = useNavigate();
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);

  useEffect(() => {
    const checkInstallation = async () => {
      if (window.electronAPI) {
        try {
          const installed = await window.electronAPI.kobold.isInstalled();
          navigate(installed ? '/launch' : '/download', { replace: true });
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
  }, [navigate]);

  const handleInstallComplete = () => {
    navigate('/launch');
  };

  const handleDownloadStart = () => {
    navigate('/download');
  };

  const handleUpdateIgnore = () => {
    setShowUpdateDialog(false);
  };

  const handleUpdateAccept = () => {
    setShowUpdateDialog(false);
    navigate('/download');
  };

  return (
    <AppShell header={{ height: 60 }} padding="md">
      <AppShell.Header>
        <Group h="100%" px="md" justify="flex-end">
          <SettingsButton />
        </Group>
      </AppShell.Header>

      <AppShell.Main>
        <Routes>
          <Route
            path="/download"
            element={
              <DownloadScreen onInstallComplete={handleInstallComplete} />
            }
          />
          <Route
            path="/launch"
            element={<LaunchScreen onBackToDownload={handleDownloadStart} />}
          />
          <Route path="*" element={<Navigate to="/download" replace />} />
        </Routes>

        {showUpdateDialog && updateInfo && (
          <UpdateDialog
            updateInfo={updateInfo}
            onIgnore={handleUpdateIgnore}
            onAccept={handleUpdateAccept}
          />
        )}
      </AppShell.Main>
    </AppShell>
  );
};

export const App = () => (
  <BrowserRouter>
    <AppContent />
  </BrowserRouter>
);
