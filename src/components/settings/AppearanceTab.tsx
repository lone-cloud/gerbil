import {
  Stack,
  Text,
  Group,
  SegmentedControl,
  rem,
  useMantineColorScheme,
  useComputedColorScheme,
  Slider,
  TextInput,
  type MantineColorScheme,
} from '@mantine/core';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useState, useEffect } from 'react';
import { safeExecute } from '@/utils/logger';
import {
  zoomLevelToPercentage,
  percentageToZoomLevel,
  isValidZoomPercentage,
} from '@/utils/zoom';
import { ZOOM } from '@/constants';

export const AppearanceTab = () => {
  const { colorScheme, setColorScheme } = useMantineColorScheme();
  const computedColorScheme = useComputedColorScheme('light', {
    getInitialValueInEffect: false,
  });
  const isDark = computedColorScheme === 'dark';

  const [zoomLevel, setZoomLevel] = useState<number>(ZOOM.DEFAULT_LEVEL);
  const [zoomPercentage, setZoomPercentage] = useState<string>(
    ZOOM.DEFAULT_PERCENTAGE.toString()
  );

  useEffect(() => {
    const loadSettings = async () => {
      const [currentZoom, savedColorScheme] = await Promise.all([
        safeExecute(
          () => window.electronAPI.app.getZoomLevel(),
          'Failed to load zoom level:'
        ),
        safeExecute(
          () => window.electronAPI.app.getColorScheme(),
          'Failed to load color scheme:'
        ),
      ]);

      if (typeof currentZoom === 'number') {
        setZoomLevel(currentZoom);
        setZoomPercentage(zoomLevelToPercentage(currentZoom).toString());
      }

      if (savedColorScheme && savedColorScheme !== colorScheme) {
        setColorScheme(savedColorScheme as MantineColorScheme);
      }
    };

    void loadSettings();
  }, [colorScheme, setColorScheme]);

  const handleColorSchemeChange = async (value: string) => {
    const newColorScheme = value as MantineColorScheme;
    setColorScheme(newColorScheme);

    await safeExecute(
      () => window.electronAPI.app.setColorScheme(newColorScheme),
      'Failed to save color scheme:'
    );
  };

  const handleZoomChange = async (newZoomLevel: number) => {
    setZoomLevel(newZoomLevel);
    const percentage = zoomLevelToPercentage(newZoomLevel);
    setZoomPercentage(percentage.toString());

    await safeExecute(
      () => window.electronAPI.app.setZoomLevel(newZoomLevel),
      'Failed to set zoom level:'
    );
  };

  const handleZoomPercentageChange = async (value: string) => {
    setZoomPercentage(value);
    const numValue = Number(value);
    if (!isNaN(numValue) && isValidZoomPercentage(numValue)) {
      const newZoomLevel = percentageToZoomLevel(numValue);
      setZoomLevel(newZoomLevel);

      await safeExecute(
        () => window.electronAPI.app.setZoomLevel(newZoomLevel),
        'Failed to set zoom level:'
      );
    }
  };

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
          value={colorScheme}
          onChange={handleColorSchemeChange}
          styles={(theme) => ({
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
              marks={[
                {
                  value: ZOOM.MIN_LEVEL,
                  label: `${ZOOM.MIN_PERCENTAGE}%`,
                },
                {
                  value: ZOOM.DEFAULT_LEVEL,
                  label: `${ZOOM.DEFAULT_PERCENTAGE}%`,
                },
                {
                  value: ZOOM.MAX_LEVEL,
                  label: `${ZOOM.MAX_PERCENTAGE}%`,
                },
              ]}
              label={(value) => `${zoomLevelToPercentage(value)}%`}
              style={{ marginBottom: '0.5rem' }}
            />
          </div>
        </Group>
      </div>
    </Stack>
  );
};
