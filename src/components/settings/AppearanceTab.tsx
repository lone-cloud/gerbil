import { Group, rem, SegmentedControl, Slider, Stack, Text, TextInput } from '@mantine/core';
import type { MantineColorScheme } from '@mantine/core';
import { Monitor, Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';

import { FrontendInterfaceSelector } from '@/components/settings/FrontendInterfaceSelector';
import { ZOOM } from '@/constants';
import { usePreferencesStore } from '@/stores/preferences';
import { isValidZoomPercentage, percentageToZoomLevel, zoomLevelToPercentage } from '@/utils/zoom';

interface AppearanceTabProps {
  isOnInterfaceScreen?: boolean;
}

export const AppearanceTab = ({ isOnInterfaceScreen = false }: AppearanceTabProps) => {
  const { rawColorScheme, setColorScheme: setStoreColorScheme } = usePreferencesStore();
  const [zoomLevel, setZoomLevel] = useState(ZOOM.DEFAULT_LEVEL as number);
  const [zoomPercentage, setZoomPercentage] = useState(ZOOM.DEFAULT_PERCENTAGE.toString());

  useEffect(() => {
    const loadSettings = async () => {
      const currentZoom = await window.electronAPI.app.getZoomLevel();

      if (typeof currentZoom === 'number') {
        setZoomLevel(currentZoom);
        setZoomPercentage(zoomLevelToPercentage(currentZoom).toString());
      }
    };

    void loadSettings();
  }, []);

  const handleColorSchemeChange = (value: string) => {
    const newColorScheme = value as MantineColorScheme;
    void setStoreColorScheme(newColorScheme);
  };

  const handleZoomChange = (newZoomLevel: number) => {
    setZoomLevel(newZoomLevel);
    const percentage = zoomLevelToPercentage(newZoomLevel);
    setZoomPercentage(percentage.toString());

    void window.electronAPI.app.setZoomLevel(newZoomLevel);
  };

  const handleZoomPercentageChange = (value: string) => {
    setZoomPercentage(value);
    const numValue = Number(value);
    if (!Number.isNaN(numValue) && isValidZoomPercentage(numValue)) {
      const newZoomLevel = percentageToZoomLevel(numValue);
      setZoomLevel(newZoomLevel);

      void window.electronAPI.app.setZoomLevel(newZoomLevel);
    }
  };

  return (
    <Stack gap="lg" h="100%">
      <FrontendInterfaceSelector isOnInterfaceScreen={isOnInterfaceScreen} />
      <div>
        <Text fw={500} mb="xs">
          Theme
        </Text>
        <Text size="sm" c="dimmed" mb="md">
          Choose how the application should appear
        </Text>
        <SegmentedControl
          fullWidth
          value={rawColorScheme}
          onChange={handleColorSchemeChange}
          style={
            {
              '--sc-indicator-color':
                'light-dark(var(--mantine-color-gray-2), var(--mantine-color-dark-5))',
              '--sc-indicator-border':
                'light-dark(var(--mantine-color-gray-4), var(--mantine-color-dark-4))',
              border:
                '0.5px solid light-dark(var(--mantine-color-gray-4), var(--mantine-color-dark-4))',
            } as CSSProperties
          }
          data={[
            {
              label: (
                <Group gap="xs" justify="center">
                  <Sun style={{ height: rem(16), width: rem(16) }} />
                  <span>Light</span>
                </Group>
              ),
              value: 'light',
            },
            {
              label: (
                <Group gap="xs" justify="center">
                  <Moon style={{ height: rem(16), width: rem(16) }} />
                  <span>Dark</span>
                </Group>
              ),
              value: 'dark',
            },
            {
              label: (
                <Group gap="xs" justify="center">
                  <Monitor style={{ height: rem(16), width: rem(16) }} />
                  <span>System</span>
                </Group>
              ),
              value: 'auto',
            },
          ]}
        />
      </div>
      <div>
        <Text fw={500} mb="xs">
          Zoom Level
        </Text>
        <Group justify="space-between" align="center" mb="md">
          <Text size="sm" c="dimmed">
            Adjust the zoom level of the application interface
          </Text>
          <TextInput
            value={zoomPercentage}
            onChange={(event) => handleZoomPercentageChange(event.currentTarget.value)}
            onBlur={(event) => {
              const { value } = event.currentTarget;
              const numValue = Number(value);
              if (Number.isNaN(numValue) || !isValidZoomPercentage(numValue)) {
                setZoomPercentage(zoomLevelToPercentage(zoomLevel).toString());
              }
            }}
            rightSection={
              <Text size="sm" c="dimmed">
                %
              </Text>
            }
            size="sm"
            w={80}
            styles={{
              input: {
                textAlign: 'center',
              },
            }}
          />
        </Group>
        <Group gap="md" align="flex-end">
          <div style={{ flex: 1 }}>
            <Slider
              value={zoomLevel}
              onChange={handleZoomChange}
              min={ZOOM.MIN_LEVEL}
              max={ZOOM.MAX_LEVEL}
              step={0.25}
              label={(value) => `${zoomLevelToPercentage(value)}%`}
              style={{ marginBottom: '0.5rem' }}
            />
          </div>
        </Group>
      </div>
    </Stack>
  );
};
