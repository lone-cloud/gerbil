import {
  Group,
  ActionIcon,
  Box,
  Image,
  Select,
  useComputedColorScheme,
  AppShell,
} from '@mantine/core';
import {
  Minus,
  Square,
  X,
  Copy,
  CircleFadingArrowUp,
  Settings,
} from 'lucide-react';
import { useState } from 'react';
import { useAppUpdateChecker } from '@/hooks/useAppUpdateChecker';
import { useInterfaceOptions } from '@/hooks/useInterfaceSelection';
import { useLogoClickSounds } from '@/hooks/useLogoClickSounds';
import { SettingsModal } from '@/components/settings/SettingsModal';
import icon from '/icon.png';
import { PRODUCT_NAME, TITLEBAR_HEIGHT } from '@/constants';
import type { InterfaceTab, Screen } from '@/types';

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
  const computedColorScheme = useComputedColorScheme('light', {
    getInitialValueInEffect: true,
  });
  const { hasUpdate, releaseUrl } = useAppUpdateChecker();
  const interfaceOptions = useInterfaceOptions();
  const { handleLogoClick, getLogoStyles } = useLogoClickSounds();
  const [isMaximized, setIsMaximized] = useState(false);
  const [isSelectOpen, setIsSelectOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);

  const handleMinimize = () => {
    window.electronAPI.app.minimizeWindow();
  };

  const handleMaximize = async () => {
    await window.electronAPI.app.maximizeWindow();
    setIsMaximized(!isMaximized);
  };

  const handleClose = () => {
    window.electronAPI.app.closeWindow();
  };

  return (
    <AppShell.Header style={{ display: 'flex', flexDirection: 'column' }}>
      <Box
        style={{
          height: TITLEBAR_HEIGHT,
          padding: '0.125rem 0 0.125rem 0.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor:
            computedColorScheme === 'dark'
              ? 'var(--mantine-color-dark-8)'
              : 'var(--mantine-color-gray-1)',
          borderBottom: '1px solid var(--mantine-color-default-border)',
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
              onChange={(value) => {
                if (value === 'eject') {
                  onEject();
                } else {
                  onTabChange(value as InterfaceTab);
                }
              }}
              onDropdownOpen={() => setIsSelectOpen(true)}
              onDropdownClose={() => setIsSelectOpen(false)}
              data={interfaceOptions}
              renderOption={({ option }) => (
                <Box
                  style={{
                    textAlign: 'center',
                    color:
                      option.value === 'eject'
                        ? 'var(--mantine-color-red-6)'
                        : undefined,
                    fontWeight: option.value === 'eject' ? 600 : undefined,
                  }}
                >
                  {option.label}
                </Box>
              )}
              allowDeselect={false}
              variant="unstyled"
              size="sm"
              style={{
                textAlign: 'center',
                minWidth: '7.5rem',
              }}
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
          {hasUpdate && releaseUrl && (
            <ActionIcon
              component="a"
              href={releaseUrl}
              target="_blank"
              rel="noopener noreferrer"
              variant="subtle"
              color="orange"
              size={TITLEBAR_HEIGHT}
              aria-label="New release available"
              tabIndex={-1}
              style={{
                borderRadius: 0,
                margin: 0,
              }}
            >
              <CircleFadingArrowUp size="1.25rem" />
            </ActionIcon>
          )}

          <ActionIcon
            variant="subtle"
            size={TITLEBAR_HEIGHT}
            onClick={() => setSettingsModalOpen(true)}
            aria-label="Open settings"
            tabIndex={-1}
            style={{
              borderRadius: 0,
              margin: 0,
              outline: 'none',
            }}
          >
            <Settings size="1.25rem" />
          </ActionIcon>

          <Box
            style={{
              width: '0.0625rem',
              height: '1.25rem',
              backgroundColor: 'var(--mantine-color-default-border)',
              margin: '0 0.25rem',
            }}
          />

          {[
            {
              icon: <Minus size="1rem" />,
              onClick: handleMinimize,
              color: undefined,
              label: 'Minimize window',
            },
            {
              icon: isMaximized ? <Copy size="1rem" /> : <Square size="1rem" />,
              onClick: handleMaximize,
              color: undefined,
              label: isMaximized ? 'Restore window' : 'Maximize window',
            },
            {
              icon: <X size="1.25rem" />,
              onClick: handleClose,
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
                borderRadius: 0,
                margin: 0,
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
