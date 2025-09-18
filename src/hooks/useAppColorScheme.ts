import { useState, useEffect } from 'react';
import { useMantineColorScheme } from '@mantine/core';
import { safeExecute } from '@/utils/logger';

type ColorScheme = 'light' | 'dark';

export const useAppColorScheme = () => {
  const [colorScheme, setColorScheme] = useState<ColorScheme>('light');
  const { setColorScheme: setMantineColorScheme } = useMantineColorScheme();

  useEffect(() => {
    const loadColorScheme = async () => {
      const rawScheme = await safeExecute(
        () => window.electronAPI.app.getColorScheme(),
        'Failed to get app color scheme'
      );

      if (rawScheme) {
        let resolvedScheme: ColorScheme;

        if (rawScheme === 'auto') {
          const prefersDark = window.matchMedia(
            '(prefers-color-scheme: dark)'
          ).matches;
          resolvedScheme = prefersDark ? 'dark' : 'light';
        } else {
          resolvedScheme = rawScheme;
        }

        setColorScheme(resolvedScheme);
        setMantineColorScheme(resolvedScheme);
      }
    };

    void loadColorScheme();
  }, [setMantineColorScheme]);

  return colorScheme;
};
