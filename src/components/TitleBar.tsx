import {
  Group,
  ActionIcon,
  Box,
  Image,
  Select,
  useComputedColorScheme,
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
import iconUrl from '/icon.png';
import type { InterfaceTab, Screen } from '@/types';
import { PRODUCT_NAME, TITLEBAR_HEIGHT } from '@/constants';

interface TitleBarProps {
  currentScreen: Screen;
  currentTab?: InterfaceTab;
  onTabChange?: (tab: InterfaceTab) => void;
  onEject?: () => void;
  onOpenSettings?: () => void;
  isModalOpen?: boolean;
}

export const TitleBar = ({
  currentScreen,
  currentTab,
  onTabChange,
  onEject,
  onOpenSettings,
  isModalOpen = false,
}: TitleBarProps) => {
  const computedColorScheme = useComputedColorScheme('light', {
    getInitialValueInEffect: false,
  });
  const { hasUpdate, openReleasePage } = useAppUpdateChecker();
  const [logoClickCount, setLogoClickCount] = useState(0);
  const [isElephantMode, setIsElephantMode] = useState(false);
  const [isMouseSqueaking, setIsMouseSqueaking] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);

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
    <Box
      style={{
        height: TITLEBAR_HEIGHT,
        padding: '0.125rem 0.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor:
          computedColorScheme === 'dark'
            ? 'var(--mantine-color-dark-7)'
            : 'var(--mantine-color-gray-0)',
        borderBottom: '1px solid var(--mantine-color-default-border)',
        WebkitAppRegion: isModalOpen ? 'no-drag' : 'drag',
        userSelect: 'none',
        position: 'relative',
      }}
    >
      <Group gap="0.5rem" align="center" style={{ WebkitAppRegion: 'no-drag' }}>
        <Image
          src={iconUrl}
          alt={PRODUCT_NAME}
          w={24}
          h={24}
          style={{
            minWidth: 24,
            minHeight: 24,
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
            data={[
              {
                value: 'chat',
                label: 'Chat',
              },
              { value: 'terminal', label: 'Terminal' },
              { value: 'eject', label: 'Eject' },
            ]}
            allowDeselect={false}
            variant="unstyled"
            size="sm"
            style={{
              textAlign: 'center',
              minWidth: '120px',
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

      <Group gap="0.125rem" style={{ WebkitAppRegion: 'no-drag' }}>
        {hasUpdate && (
          <ActionIcon
            variant="subtle"
            color="orange"
            size="2rem"
            onClick={openReleasePage}
            aria-label="New release available"
            style={{
              borderRadius: '0.25rem',
              margin: '0.125rem',
            }}
          >
            <CircleFadingArrowUp size="1.25rem" />
          </ActionIcon>
        )}

        <ActionIcon
          variant="subtle"
          size="2rem"
          onClick={onOpenSettings}
          aria-label="Open settings"
          style={{
            borderRadius: '0.25rem',
            margin: '0.125rem',
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
            size="2rem"
            onClick={button.onClick}
            color={button.color}
            aria-label={button.label}
            style={{
              borderRadius: '0.25rem',
              margin: '0.125rem',
            }}
          >
            {button.icon}
          </ActionIcon>
        ))}
      </Group>
    </Box>
  );
};
