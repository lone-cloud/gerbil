import { useState, useEffect } from 'react';

type ColorScheme = 'light' | 'dark';

export const useAppColorScheme = () => {
  const [colorScheme, setColorScheme] = useState<ColorScheme>('light');

  useEffect(() => {
    const loadColorScheme = async () => {
      const rawScheme = await window.electronAPI.app.getColorScheme();

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
      }
    };

    void loadColorScheme();
  }, []);

  return colorScheme;
};
