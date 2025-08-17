import { useState } from 'react';
import {
  AppShell,
  Group,
  ActionIcon,
  rem,
  Button,
  Select,
  Title,
  Image,
  useMantineColorScheme,
} from '@mantine/core';
import { Settings, ArrowLeft } from 'lucide-react';
import { StyledTooltip } from '../StyledTooltip';
import { soundAssets, playSound } from '../../utils/sounds';
import './AppHeader.css';

type Screen = 'download' | 'launch' | 'interface';

interface AppHeaderProps {
  currentScreen: Screen | null;
  activeInterfaceTab: string | null;
  setActiveInterfaceTab: (tab: string | null) => void;
  isImageGenerationMode: boolean;
  onEject: () => void;
  onSettingsOpen: () => void;
}

export const AppHeader = ({
  currentScreen,
  activeInterfaceTab,
  setActiveInterfaceTab,
  isImageGenerationMode,
  onEject,
  onSettingsOpen,
}: AppHeaderProps) => {
  const [logoClickCount, setLogoClickCount] = useState(0);
  const [isElephantMode, setIsElephantMode] = useState(false);
  const [isMouseSqueaking, setIsMouseSqueaking] = useState(false);
  const { colorScheme } = useMantineColorScheme();

  const handleLogoClick = () => {
    setLogoClickCount((prev) => prev + 1);

    try {
      if (logoClickCount >= 10 && Math.random() < 0.1) {
        setIsElephantMode(true);
        playSound(soundAssets.elephant, 0.6);

        setTimeout(() => {
          setIsElephantMode(false);
        }, 1500);
      } else {
        setIsMouseSqueaking(true);
        const squeakNumber = Math.floor(Math.random() * 5);
        playSound(soundAssets.mouseSqueaks[squeakNumber], 0.4);

        setTimeout(() => {
          setIsMouseSqueaking(false);
        }, 300);
      }
    } catch {
      void 0;
    }
  };

  return (
    <AppShell.Header
      style={{
        borderBottom: `1px solid var(--mantine-color-${colorScheme === 'dark' ? 'dark-4' : 'gray-3'})`,
        background:
          colorScheme === 'dark'
            ? 'var(--mantine-color-dark-7)'
            : 'var(--mantine-color-white)',
        transition: 'all 200ms ease',
      }}
    >
      <Group h="100%" px="md" justify="space-between" align="center">
        <div style={{ minWidth: '100px' }}>
          {currentScreen === 'interface' ? (
            <Button
              variant="light"
              color="red"
              leftSection={<ArrowLeft size={16} />}
              onClick={onEject}
            >
              Eject
            </Button>
          ) : (
            <Group gap="xs" align="center">
              <Image
                src="/icon.png"
                alt="Friendly Kobold"
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
              <Title order={4} c="dimmed" fw={500}>
                Friendly Kobold
              </Title>
            </Group>
          )}
        </div>

        {currentScreen === 'interface' && (
          <Select
            value={activeInterfaceTab}
            onChange={setActiveInterfaceTab}
            data={[
              {
                value: 'chat',
                label: isImageGenerationMode ? 'Stable UI' : 'KoboldAI Lite',
              },
              { value: 'terminal', label: 'Terminal' },
            ]}
            placeholder="Select view"
            styles={{
              input: {
                minWidth: '150px',
                textAlign: 'center',
                border: 'none',
                backgroundColor: 'transparent',
                fontWeight: 500,
              },
              dropdown: {
                minWidth: '150px',
              },
            }}
          />
        )}

        <div
          style={{
            minWidth: '100px',
            display: 'flex',
            justifyContent: 'flex-end',
          }}
        >
          <StyledTooltip label="Settings" position="bottom">
            <ActionIcon
              variant="subtle"
              color="gray"
              size="xl"
              onClick={onSettingsOpen}
              aria-label="Open settings"
              style={{
                transition: 'all 200ms ease',
              }}
            >
              <Settings style={{ width: rem(20), height: rem(20) }} />
            </ActionIcon>
          </StyledTooltip>
        </div>
      </Group>
    </AppShell.Header>
  );
};
