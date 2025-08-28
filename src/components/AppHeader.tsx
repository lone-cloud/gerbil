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
  Tooltip,
} from '@mantine/core';
import { Settings, ArrowLeft } from 'lucide-react';
import { soundAssets, playSound, initializeAudio } from '@/utils/sounds';
import iconUrl from '/icon.png';
import { FRONTENDS } from '@/constants';
import type { InterfaceTab, FrontendPreference, Screen } from '@/types';

interface AppHeaderProps {
  currentScreen: Screen | null;
  activeInterfaceTab: InterfaceTab;
  setActiveInterfaceTab: (tab: InterfaceTab) => void;
  isImageGenerationMode: boolean;
  frontendPreference: FrontendPreference;
  onEject: () => void;
  onSettingsOpen: () => void;
}

export const AppHeader = ({
  currentScreen,
  activeInterfaceTab,
  setActiveInterfaceTab,
  isImageGenerationMode,
  frontendPreference,
  onEject,
  onSettingsOpen,
}: AppHeaderProps) => {
  const [logoClickCount, setLogoClickCount] = useState(0);
  const [isElephantMode, setIsElephantMode] = useState(false);
  const [isMouseSqueaking, setIsMouseSqueaking] = useState(false);

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
    <AppShell.Header>
      <Group h="100%" px="md" justify="space-between" align="center">
        <div style={{ minWidth: '6.25rem' }}>
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
            <Group gap="sm" align="center">
              <Image
                src={iconUrl}
                alt="Friendly Kobold"
                w={28}
                h={28}
                style={{
                  minWidth: 28,
                  minHeight: 28,
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
              <Title order={4} fw={500}>
                Friendly Kobold
              </Title>
            </Group>
          )}
        </div>

        {currentScreen === 'interface' && (
          <Select
            value={activeInterfaceTab}
            onChange={(value) =>
              setActiveInterfaceTab((value || 'terminal') as InterfaceTab)
            }
            data={[
              {
                value: 'chat',
                label:
                  frontendPreference === 'sillytavern'
                    ? FRONTENDS.SILLYTAVERN
                    : isImageGenerationMode
                      ? FRONTENDS.STABLE_UI
                      : FRONTENDS.KOBOLDAI_LITE,
              },
              { value: 'terminal', label: 'Terminal' },
            ]}
            allowDeselect={false}
            styles={{
              input: {
                minWidth: '9.375rem',
                textAlign: 'center',
                border: 'none',
                backgroundColor: 'transparent',
                fontWeight: 500,
              },
              dropdown: {
                minWidth: '9.375rem',
              },
            }}
          />
        )}

        <div
          style={{
            minWidth: '6.25rem',
            display: 'flex',
            justifyContent: 'flex-end',
          }}
        >
          <Tooltip label="Settings" position="bottom">
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
          </Tooltip>
        </div>
      </Group>
    </AppShell.Header>
  );
};
