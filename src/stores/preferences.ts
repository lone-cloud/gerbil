import { create } from 'zustand';
import type { MantineColorScheme } from '@mantine/core';
import type { FrontendPreference } from '@/types';

type ResolvedColorScheme = 'light' | 'dark';

interface PreferencesStore {
  frontendPreference: FrontendPreference;
  rawColorScheme: MantineColorScheme;
  resolvedColorScheme: ResolvedColorScheme;

  setFrontendPreference: (preference: FrontendPreference) => void;
  setColorScheme: (scheme: MantineColorScheme) => Promise<void>;
  loadPreferences: () => Promise<void>;
}

const resolveColorScheme = (raw: MantineColorScheme): ResolvedColorScheme => {
  if (raw === 'auto') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  }
  return raw;
};

export const usePreferencesStore = create<PreferencesStore>((set) => ({
  frontendPreference: 'koboldcpp',
  rawColorScheme: 'auto',
  resolvedColorScheme: 'light',

  setFrontendPreference: (preference: FrontendPreference) => {
    set({ frontendPreference: preference });
    window.electronAPI.config.set('frontendPreference', preference);
  },

  setColorScheme: async (scheme: MantineColorScheme) => {
    set({
      rawColorScheme: scheme,
      resolvedColorScheme: resolveColorScheme(scheme),
    });
    await window.electronAPI.app.setColorScheme(scheme);
  },

  loadPreferences: async () => {
    const [frontendPref, colorScheme] = await Promise.all([
      window.electronAPI.config.get(
        'frontendPreference'
      ) as Promise<FrontendPreference>,
      window.electronAPI.app.getColorScheme(),
    ]);

    set({
      frontendPreference: frontendPref || 'koboldcpp',
      rawColorScheme: colorScheme || 'auto',
      resolvedColorScheme: resolveColorScheme(colorScheme || 'auto'),
    });
  },
}));

void usePreferencesStore.getState().loadPreferences();
