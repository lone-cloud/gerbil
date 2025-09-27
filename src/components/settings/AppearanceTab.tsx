import {
  Stack,
  Text,
  Group,
  SegmentedControl,
  rem,
  Slider,
  TextInput,
  type MantineColorScheme,
} from '@mantine/core';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useState, useEffect } from 'react';
import { usePreferencesStore } from '@/stores/preferences';
import { ZOOM } from '@/constants';
import { FrontendInterfaceSelector } from '@/components/settings/FrontendInterfaceSelector';
import {
  zoomLevelToPercentage,
  percentageToZoomLevel,
  isValidZoomPercentage,
} from '@/utils/zoom';

interface AppearanceTabProps {
  isOnInterfaceScreen?: boolean;
}

export const AppearanceTab = ({
  isOnInterfaceScreen = false,
}: AppearanceTabProps) => {
  const {
    rawColorScheme,
    resolvedColorScheme,
    setColorScheme: setStoreColorScheme,
  } = usePreferencesStore();
  const isDark = resolvedColorScheme === 'dark';

  const [zoomLevel, setZoomLevel] = useState<number>(ZOOM.DEFAULT_LEVEL);
  const [zoomPercentage, setZoomPercentage] = useState(
    ZOOM.DEFAULT_PERCENTAGE.toString()
  );

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
    if (!isNaN(numValue) && isValidZoomPercentage(numValue)) {
      const newZoomLevel = percentageToZoomLevel(numValue);
      setZoomLevel(newZoomLevel);

      void window.electronAPI.app.setZoomLevel(newZoomLevel);
    }
  };

  return (
    <Stack gap="lg" h="100%">
      <div>
        <FrontendInterfaceSelector isOnInterfaceScreen={isOnInterfaceScreen} />
      </div>
      <div>
        <Text fw={500} mb="sm">
          Theme
        </Text>
        <Text size="sm" c="dimmed" mb="md">
          Choose how the application should appear
        </Text>
        <SegmentedControl
          fullWidth
          value={rawColorScheme}
          onChange={handleColorSchemeChange}
          styles={(theme) => ({
            root: {
              border: `0.5px solid ${
                isDark ? theme.colors.dark[4] : theme.colors.gray[4]
              }`,
            },
            indicator: {
              backgroundColor: isDark
                ? theme.colors.dark[5]
                : theme.colors.gray[2],
              border: `1px solid ${
                isDark ? theme.colors.dark[4] : theme.colors.gray[4]
              }`,
            },
          })}
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
              value: 'auto',
            },
          ]}
        />
      </div>
      <div>
        <Text fw={500} mb="sm">
          Zoom Level
        </Text>
        <Group justify="space-between" align="center" mb="md">
          <Text size="sm" c="dimmed">
            Adjust the zoom level of the application interface
          </Text>
          <TextInput
            value={zoomPercentage}
            onChange={(event) =>
              handleZoomPercentageChange(event.currentTarget.value)
            }
            onBlur={(event) => {
              const value = event.currentTarget.value;
              const numValue = Number(value);
              if (isNaN(numValue) || !isValidZoomPercentage(numValue)) {
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
