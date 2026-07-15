import type { MantineColorScheme } from '@mantine/core';
import { create } from 'zustand';

import type { FrontendPreference, ImageGenerationFrontendPreference } from '@/types';

type ResolvedColorScheme = 'light' | 'dark';

interface PreferencesStore {
  frontendPreference: FrontendPreference;
  imageGenerationFrontendPreference: ImageGenerationFrontendPreference;
  ignoreIGPUs: boolean;
  rawColorScheme: MantineColorScheme;
  resolvedColorScheme: ResolvedColorScheme;
  systemMonitoringEnabled: boolean;

  setFrontendPreference: (preference: FrontendPreference) => void;
  setImageGenerationFrontendPreference: (preference: ImageGenerationFrontendPreference) => void;
  setIgnoreIGPUs: (ignore: boolean) => void;
  setColorScheme: (scheme: MantineColorScheme) => Promise<void>;
  setSystemMonitoringEnabled: (enabled: boolean) => void;
  loadPreferences: () => Promise<void>;
}

const resolveColorScheme = (raw: MantineColorScheme): ResolvedColorScheme => {
  if (raw === 'auto') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return raw;
};

const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
mediaQuery.addEventListener('change', () => {
  const { rawColorScheme } = usePreferencesStore.getState();
  if (rawColorScheme === 'auto') {
    usePreferencesStore.setState({
      resolvedColorScheme: resolveColorScheme('auto'),
    });
  }
});

export const usePreferencesStore = create<PreferencesStore>((set) => ({
  frontendPreference: 'koboldcpp',
  ignoreIGPUs: true,
  imageGenerationFrontendPreference: 'match',
  loadPreferences: async () => {
    const [frontendPref, imageGenFrontendPref, colorScheme, systemMonitoring, ignoreIGPUs] =
      await Promise.all([
        window.electronAPI.config.get('frontendPreference') as Promise<FrontendPreference>,
        window.electronAPI.config.get(
          'imageGenerationFrontendPreference',
        ) as Promise<ImageGenerationFrontendPreference>,
        window.electronAPI.app.getColorScheme(),
        window.electronAPI.config.get('systemMonitoringEnabled') as Promise<boolean>,
        window.electronAPI.config.get('ignoreIGPUs') as Promise<boolean>,
      ]);

    set({
      frontendPreference: frontendPref || 'koboldcpp',
      ignoreIGPUs: ignoreIGPUs ?? true,
      imageGenerationFrontendPreference: imageGenFrontendPref || 'match',
      rawColorScheme: colorScheme || 'auto',
      resolvedColorScheme: resolveColorScheme(colorScheme || 'auto'),
      systemMonitoringEnabled: systemMonitoring ?? true,
    });
  },
  rawColorScheme: 'auto',
  resolvedColorScheme: 'light',

  setColorScheme: async (scheme: MantineColorScheme) => {
    set({
      rawColorScheme: scheme,
      resolvedColorScheme: resolveColorScheme(scheme),
    });
    await window.electronAPI.app.setColorScheme(scheme);
  },

  setFrontendPreference: (preference: FrontendPreference) => {
    set({ frontendPreference: preference });
    window.electronAPI.config.set('frontendPreference', preference);
  },

  setImageGenerationFrontendPreference: (preference: ImageGenerationFrontendPreference) => {
    set({ imageGenerationFrontendPreference: preference });
    window.electronAPI.config.set('imageGenerationFrontendPreference', preference);
  },

  setIgnoreIGPUs: (ignore: boolean) => {
    set({ ignoreIGPUs: ignore });
    window.electronAPI.config.set('ignoreIGPUs', ignore);
  },

  setSystemMonitoringEnabled: (enabled: boolean) => {
    set({ systemMonitoringEnabled: enabled });
    window.electronAPI.config.set('systemMonitoringEnabled', enabled);
  },

  systemMonitoringEnabled: true,
}));

void usePreferencesStore.getState().loadPreferences();
