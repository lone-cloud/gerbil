import { Stack, Text, Group, SegmentedControl, rem } from '@mantine/core';
import { useMantineColorScheme, useComputedColorScheme } from '@mantine/core';
import { Sun, Moon, Monitor } from 'lucide-react';

export const AppearanceTab = () => {
  const { colorScheme, setColorScheme } = useMantineColorScheme();
  const computedColorScheme = useComputedColorScheme('light', {
    getInitialValueInEffect: false,
  });
  const isDark = computedColorScheme === 'dark';

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
          onChange={(value) =>
            setColorScheme(value as 'light' | 'dark' | 'auto')
          }
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
    </Stack>
  );
};
