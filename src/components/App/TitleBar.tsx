import icon from '/icon.png';
import { ActionIcon, AppShell, Box, Group, Image, Tooltip } from '@mantine/core';
import { Copy, Minus, Settings, Square, X } from 'lucide-react';
import { useEffect, useState } from 'react';

import { UpdateButton } from '@/components/App/UpdateButton';
import { Select } from '@/components/Select';
import { SettingsModal } from '@/components/settings/SettingsModal';
import { PRODUCT_NAME, TITLEBAR_HEIGHT } from '@/constants';
import { useLogoClickSounds } from '@/hooks/useLogoClickSounds';
import { useLaunchConfigStore } from '@/stores/launchConfig';
import { usePreferencesStore } from '@/stores/preferences';
import type { InterfaceTab, Screen, SelectOption } from '@/types';
import { getAvailableInterfaceOptions } from '@/utils/interface';

interface TitleBarProps {
  currentScreen: Screen;
  currentTab: InterfaceTab;
  onEject: () => void;
  onTabChange: (tab: InterfaceTab) => void;
}

const renderOption = ({ option }: { option: SelectOption }) => (
  <Box
    style={{
      color: option.value === 'eject' ? 'var(--mantine-color-red-6)' : undefined,
      fontWeight: option.value === 'eject' ? 600 : undefined,
      textAlign: 'center',
    }}
  >
    {option.label}
  </Box>
);

export const TitleBar = ({ currentScreen, currentTab, onEject, onTabChange }: TitleBarProps) => {
  const {
    resolvedColorScheme: colorScheme,
    frontendPreference,
    imageGenerationFrontendPreference,
  } = usePreferencesStore();
  const { handleLogoClick, getLogoStyles } = useLogoClickSounds();
  const [isMaximized, setIsMaximized] = useState(false);
  const [isSelectOpen, setIsSelectOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);

  const { isTextMode, isImageGenerationMode } = useLaunchConfigStore();

  const handleTabChange = (value: string | null) => {
    if (value === 'eject') {
      onEject();
    } else if (value) {
      onTabChange(value as InterfaceTab);
    }
  };

  useEffect(() => {
    const initializeState = async () => {
      const currentMaximizedState = await window.electronAPI.app.isMaximized();
      setIsMaximized(currentMaximizedState);
    };

    void initializeState();

    const cleanup = window.electronAPI.app.onWindowStateToggle(() =>
      setIsMaximized((prev) => !prev),
    );

    return cleanup;
  }, []);

  return (
    <AppShell.Header style={{ border: 'none', display: 'flex', flexDirection: 'column' }}>
      <Box
        style={{
          WebkitAppRegion: isSelectOpen ? 'no-drag' : 'drag',
          alignItems: 'center',
          backgroundColor:
            colorScheme === 'dark' ? 'var(--mantine-color-dark-6)' : 'var(--mantine-color-gray-1)',
          border: '1px solid var(--mantine-color-default-border)',
          display: 'flex',
          height: TITLEBAR_HEIGHT,
          justifyContent: 'space-between',
          padding: '0.125rem 0 0.125rem 0.5rem',
          position: 'relative',
          userSelect: 'none',
        }}
      >
        <Group gap="0.5rem" align="center" style={{ WebkitAppRegion: 'no-drag' }}>
          <Image
            src={icon}
            alt={PRODUCT_NAME}
            w={24}
            h={24}
            style={getLogoStyles()}
            onClick={() => void handleLogoClick()}
          />
        </Group>

        <Box
          style={{
            WebkitAppRegion: 'no-drag',
            left: '50%',
            position: 'absolute',
            transform: 'translateX(-50%)',
          }}
        >
          {currentScreen === 'interface' && (
            <Select
              placeholder="Interface"
              value={currentTab}
              onChange={handleTabChange}
              onDropdownOpen={() => setIsSelectOpen(true)}
              onDropdownClose={() => setIsSelectOpen(false)}
              data={getAvailableInterfaceOptions({
                frontendPreference,
                imageGenerationFrontendPreference,
                isImageGenerationMode,
                isTextMode,
              })}
              renderOption={renderOption}
              variant="unstyled"
              style={{ minWidth: '7.5rem', textAlign: 'center' }}
              styles={{
                input: {
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'center',
                  userSelect: 'none',
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
              backgroundColor:
                colorScheme === 'dark'
                  ? 'var(--mantine-color-dark-3)'
                  : 'var(--mantine-color-gray-4)',
              height: '1.25rem',
              margin: '0 0.25rem',
              width: '0.1rem',
            }}
          />

          {[
            {
              color: undefined,
              icon: <Minus size="1rem" />,
              label: 'Minimize window',
              onClick: () => void window.electronAPI.app.minimizeWindow(),
            },
            {
              color: undefined,
              icon: isMaximized ? <Copy size="1rem" /> : <Square size="1rem" />,
              label: isMaximized ? 'Restore window' : 'Maximize window',
              onClick: () => void window.electronAPI.app.maximizeWindow(),
            },
            {
              color: 'red' as const,
              icon: <X size="1.25rem" />,
              label: 'Close window',
              onClick: () => void window.electronAPI.app.closeWindow(),
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
        key={settingsModalOpen ? 'open' : 'closed'}
        isOnInterfaceScreen={currentScreen === 'interface'}
        opened={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
        currentScreen={currentScreen || undefined}
      />
    </AppShell.Header>
  );
};
