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
  Settings,
  Copy,
  CircleFadingArrowUp,
} from 'lucide-react';
import { useState } from 'react';
import { soundAssets, playSound, initializeAudio } from '@/utils/sounds';
import { useAppUpdateChecker } from '@/hooks/useAppUpdateChecker';
import { useLaunchConfigStore } from '@/stores/launchConfig';
import iconUrl from '/icon.png';
import { FRONTENDS, PRODUCT_NAME, TITLEBAR_HEIGHT } from '@/constants';
import type { FrontendPreference, InterfaceTab, Screen } from '@/types';

interface TitleBarProps {
  currentScreen: Screen;
  currentTab?: InterfaceTab;
  onTabChange?: (tab: InterfaceTab) => void;
  onEject?: () => void;
  onOpenSettings?: () => void;
  frontendPreference?: FrontendPreference;
}

export const TitleBar = ({
  currentScreen,
  currentTab,
  onTabChange,
  onEject,
  onOpenSettings,
  frontendPreference,
}: TitleBarProps) => {
  const computedColorScheme = useComputedColorScheme('light', {
    getInitialValueInEffect: false,
  });
  const { hasUpdate, openReleasePage } = useAppUpdateChecker();
  const { isImageGenerationMode } = useLaunchConfigStore();
  const [logoClickCount, setLogoClickCount] = useState(0);
  const [isElephantMode, setIsElephantMode] = useState(false);
  const [isMouseSqueaking, setIsMouseSqueaking] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [isSelectOpen, setIsSelectOpen] = useState(false);

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

  const handleLogoClick = async () => {
    await initializeAudio();
    setLogoClickCount((prev) => prev + 1);

    try {
      if (logoClickCount >= 10 && Math.random() < 0.1) {
        setIsElephantMode(true);
        await playSound(soundAssets.elephant, 0.6);

        setTimeout(() => {
          setIsElephantMode(false);
        }, 1500);
      } else {
        setIsMouseSqueaking(true);
        const squeakNumber = Math.floor(Math.random() * 5);
        await playSound(soundAssets.mouseSqueaks[squeakNumber], 0.4);

        setTimeout(() => {
          setIsMouseSqueaking(false);
        }, 300);
      }
    } catch {
      void 0;
    }
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
            src={iconUrl}
            alt={PRODUCT_NAME}
            w={24}
            h={24}
            style={{
              cursor: 'pointer',
              userSelect: 'none',
              transition: 'transform 0.15s ease-in-out',
              transform: isElephantMode
                ? 'scale(1.3) rotate(5deg)'
                : 'scale(1) rotate(0deg)',
              animation: isElephantMode
                ? 'elephantShake 1.5s ease-in-out'
                : isMouseSqueaking
                  ? 'mouseSqueak 0.3s ease-in-out'
                  : 'none',
            }}
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
                  onEject?.();
                } else {
                  onTabChange?.(value as InterfaceTab);
                }
              }}
              onDropdownOpen={() => setIsSelectOpen(true)}
              onDropdownClose={() => setIsSelectOpen(false)}
              data={[
                {
                  value: 'chat',
                  label: (() => {
                    if (frontendPreference === 'sillytavern') {
                      return FRONTENDS.SILLYTAVERN;
                    }
                    if (
                      frontendPreference === 'openwebui' &&
                      !isImageGenerationMode
                    ) {
                      return FRONTENDS.OPENWEBUI;
                    }
                    return isImageGenerationMode
                      ? FRONTENDS.STABLE_UI
                      : FRONTENDS.KOBOLDAI_LITE;
                  })(),
                },
                { value: 'terminal', label: 'Terminal' },
                { value: 'eject', label: 'Eject' },
              ]}
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
                  fontWeight: 500,
                  userSelect: 'none',
                  cursor: 'pointer',
                },
              }}
            />
          )}
        </Box>

        <Group gap="0" style={{ WebkitAppRegion: 'no-drag' }}>
          {hasUpdate && (
            <ActionIcon
              variant="subtle"
              color="orange"
              size={TITLEBAR_HEIGHT}
              onClick={openReleasePage}
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
            onClick={onOpenSettings}
            aria-label="Open settings"
            tabIndex={-1}
            style={{
              borderRadius: '0.25rem',
              margin: 0,
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
    </AppShell.Header>
  );
};
