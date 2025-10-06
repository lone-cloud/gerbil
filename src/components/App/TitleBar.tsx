import {
  Group,
  ActionIcon,
  Box,
  Image,
  AppShell,
  Tooltip,
} from '@mantine/core';
import { Minus, Square, X, Copy, Settings } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useLaunchConfigStore } from '@/stores/launchConfig';
import { usePreferencesStore } from '@/stores/preferences';
import { getAvailableInterfaceOptions } from '@/utils/interface';
import { useLogoClickSounds } from '@/hooks/useLogoClickSounds';
import { SettingsModal } from '@/components/settings/SettingsModal';
import { UpdateButton } from '@/components/App/UpdateButton';
import icon from '/icon.png';
import { PRODUCT_NAME, TITLEBAR_HEIGHT } from '@/constants';
import type { InterfaceTab, Screen, SelectOption } from '@/types';
import { Select } from '@/components/Select';

interface TitleBarProps {
  currentScreen: Screen;
  currentTab: InterfaceTab;
  onEject: () => void;
  onTabChange: (tab: InterfaceTab) => void;
}

export const TitleBar = ({
  currentScreen,
  currentTab,
  onEject,
  onTabChange,
}: TitleBarProps) => {
  const { resolvedColorScheme: colorScheme, frontendPreference } =
    usePreferencesStore();
  const { handleLogoClick, getLogoStyles } = useLogoClickSounds();
  const [isMaximized, setIsMaximized] = useState(false);
  const [isSelectOpen, setIsSelectOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);

  const { isTextMode, isImageGenerationMode } = useLaunchConfigStore();
  const interfaceOptions = getAvailableInterfaceOptions({
    frontendPreference,
    isTextMode,
    isImageGenerationMode,
  });

  const handleTabChange = (value: string | null) => {
    if (value === 'eject') {
      onEject();
    } else if (value) {
      onTabChange(value as InterfaceTab);
    }
  };

  const renderOption = ({ option }: { option: SelectOption }) => (
    <Box
      style={{
        textAlign: 'center',
        color:
          option.value === 'eject' ? 'var(--mantine-color-red-6)' : undefined,
        fontWeight: option.value === 'eject' ? 600 : undefined,
      }}
    >
      {option.label}
    </Box>
  );

  useEffect(() => {
    const initializeState = async () => {
      const currentMaximizedState = await window.electronAPI.app.isMaximized();
      setIsMaximized(currentMaximizedState);
    };

    initializeState();

    const cleanup = window.electronAPI.app.onWindowStateToggle(() =>
      setIsMaximized((prev) => !prev)
    );

    return cleanup;
  }, []);

  return (
    <AppShell.Header
      style={{ display: 'flex', flexDirection: 'column', border: 'none' }}
    >
      <Box
        style={{
          height: TITLEBAR_HEIGHT,
          padding: '0.125rem 0 0.125rem 0.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor:
            colorScheme === 'dark'
              ? 'var(--mantine-color-dark-6)'
              : 'var(--mantine-color-gray-1)',
          border: '1px solid var(--mantine-color-default-border)',
          WebkitAppRegion: isSelectOpen ? 'no-drag' : 'drag',
          userSelect: 'none',
          position: 'relative',
        }}
      >
        <Group
          gap="0.5rem"
          align="center"
          style={{ WebkitAppRegion: 'no-drag' }}
        >
          <Image
            src={icon}
            alt={PRODUCT_NAME}
            w={24}
            h={24}
            style={getLogoStyles()}
            onClick={handleLogoClick}
          />
        </Group>

        <Box
          style={{
            position: 'absolute',
            left: '50%',
            transform: 'translateX(-50%)',
            WebkitAppRegion: 'no-drag',
          }}
        >
          {currentScreen === 'interface' && (
            <Select
              placeholder="Interface"
              value={currentTab}
              onChange={handleTabChange}
              onDropdownOpen={() => setIsSelectOpen(true)}
              onDropdownClose={() => setIsSelectOpen(false)}
              data={interfaceOptions}
              renderOption={renderOption}
              variant="unstyled"
              style={{ textAlign: 'center', minWidth: '7.5rem' }}
              styles={{
                input: {
                  textAlign: 'center',
                  backgroundColor: 'transparent',
                  border: 'none',
                  userSelect: 'none',
                  cursor: 'pointer',
                },
              }}
            />
          )}
        </Box>

        <Group gap="0" style={{ WebkitAppRegion: 'no-drag' }}>
          <UpdateButton />

          <Tooltip label="Settings" position="bottom">
            <ActionIcon
              variant="subtle"
              size={TITLEBAR_HEIGHT}
              onClick={() => setSettingsModalOpen(true)}
              aria-label="Open settings"
              tabIndex={-1}
              style={{
                outline: 'none',
              }}
            >
              <Settings size="1.25rem" />
            </ActionIcon>
          </Tooltip>

          <Box
            style={{
              width: '0.0625rem',
              height: '1.25rem',
              backgroundColor:
                colorScheme === 'dark'
                  ? 'var(--mantine-color-dark-3)'
                  : 'var(--mantine-color-default-border)',
              margin: '0 0.25rem',
            }}
          />

          {[
            {
              icon: <Minus size="1rem" />,
              onClick: () => window.electronAPI.app.minimizeWindow(),
              color: undefined,
              label: 'Minimize window',
            },
            {
              icon: isMaximized ? <Copy size="1rem" /> : <Square size="1rem" />,
              onClick: () => window.electronAPI.app.maximizeWindow(),
              color: undefined,
              label: isMaximized ? 'Restore window' : 'Maximize window',
            },
            {
              icon: <X size="1.25rem" />,
              onClick: () => window.electronAPI.app.closeWindow(),
              color: 'red' as const,
              label: 'Close window',
            },
          ].map((button, index) => (
            <ActionIcon
              key={index}
              variant="subtle"
              size={TITLEBAR_HEIGHT}
              onClick={button.onClick}
              color={button.color}
              aria-label={button.label}
              tabIndex={-1}
              style={{
                cursor: 'default',
                outline: 'none',
              }}
            >
              {button.icon}
            </ActionIcon>
          ))}
        </Group>
      </Box>

      <SettingsModal
        isOnInterfaceScreen={currentScreen === 'interface'}
        opened={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
        currentScreen={currentScreen || undefined}
      />
    </AppShell.Header>
  );
};
