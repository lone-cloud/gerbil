import {
  Stack,
  Text,
  Group,
  SegmentedControl,
  rem,
  Button,
  Alert,
} from '@mantine/core';
import {
  Sun,
  Moon,
  Monitor,
  Download,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import { useTheme, type ThemeMode } from '@/contexts/ThemeContext';
import { useState } from 'react';

export const AppearanceTab = () => {
  const { themeMode, setThemeMode } = useTheme();
  const [isInstalling, setIsInstalling] = useState(false);
  const [installResult, setInstallResult] = useState<{
    success: boolean;
    error?: string;
  } | null>(null);
  const [platform] = useState(() => navigator.platform.toLowerCase());

  const handleInstallIcon = async () => {
    setIsInstalling(true);
    setInstallResult(null);

    try {
      const result = await window.electronAPI.system.installIcon();
      setInstallResult(result);
    } catch (error) {
      setInstallResult({
        success: false,
        error:
          error instanceof Error ? error.message : 'Unknown error occurred',
      });
    } finally {
      setIsInstalling(false);
    }
  };

  const isLinux = platform.includes('linux');

  return (
    <Stack gap="lg" h="100%">
      <div>
        <Text fw={500} mb="sm">
          Theme
        </Text>
        <Text size="sm" c="dimmed" mb="md">
          Choose how the application should appear
        </Text>
        <SegmentedControl
          fullWidth
          value={themeMode}
          onChange={(value) => setThemeMode(value as ThemeMode)}
          data={[
            {
              label: (
                <Group gap="xs" justify="center">
                  <Sun style={{ width: rem(16), height: rem(16) }} />
                  <span>Light</span>
                </Group>
              ),
              value: 'light',
            },
            {
              label: (
                <Group gap="xs" justify="center">
                  <Moon style={{ width: rem(16), height: rem(16) }} />
                  <span>Dark</span>
                </Group>
              ),
              value: 'dark',
            },
            {
              label: (
                <Group gap="xs" justify="center">
                  <Monitor style={{ width: rem(16), height: rem(16) }} />
                  <span>System</span>
                </Group>
              ),
              value: 'system',
            },
          ]}
        />
      </div>

      {isLinux && (
        <div>
          <Text fw={500} mb="sm">
            System Integration
          </Text>
          <Text size="sm" c="dimmed" mb="md">
            Install application icon and desktop entry system-wide for better
            KDE Plasma/Wayland support
          </Text>

          {installResult && (
            <Alert
              icon={
                installResult.success ? (
                  <CheckCircle size={16} />
                ) : (
                  <AlertCircle size={16} />
                )
              }
              color={installResult.success ? 'green' : 'red'}
              mb="md"
            >
              {installResult.success
                ? 'Icon installed successfully! You may need to log out and back in to see the changes.'
                : `Installation failed: ${installResult.error}`}
            </Alert>
          )}

          <Button
            leftSection={<Download size={16} />}
            onClick={handleInstallIcon}
            loading={isInstalling}
            variant="light"
          >
            {isInstalling ? 'Installing...' : 'Install System Icon'}
          </Button>
        </div>
      )}
    </Stack>
  );
};
