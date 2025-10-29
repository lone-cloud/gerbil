import { create } from 'zustand';
import type { MantineColorScheme } from '@mantine/core';
import type {
  FrontendPreference,
  ImageGenerationFrontendPreference,
} from '@/types';

type ResolvedColorScheme = 'light' | 'dark';

interface PreferencesStore {
  frontendPreference: FrontendPreference;
  imageGenerationFrontendPreference: ImageGenerationFrontendPreference;
  rawColorScheme: MantineColorScheme;
  resolvedColorScheme: ResolvedColorScheme;
  systemMonitoringEnabled: boolean;

  setFrontendPreference: (preference: FrontendPreference) => void;
  setImageGenerationFrontendPreference: (
    preference: ImageGenerationFrontendPreference
  ) => void;
  setColorScheme: (scheme: MantineColorScheme) => Promise<void>;
  setSystemMonitoringEnabled: (enabled: boolean) => void;
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
  imageGenerationFrontendPreference: 'match',
  rawColorScheme: 'auto',
  resolvedColorScheme: 'light',
  systemMonitoringEnabled: true,

  setFrontendPreference: (preference: FrontendPreference) => {
    set({ frontendPreference: preference });
    window.electronAPI.config.set('frontendPreference', preference);
  },

  setImageGenerationFrontendPreference: (
    preference: ImageGenerationFrontendPreference
  ) => {
    set({ imageGenerationFrontendPreference: preference });
    window.electronAPI.config.set(
      'imageGenerationFrontendPreference',
      preference
    );
  },

  setSystemMonitoringEnabled: (enabled: boolean) => {
    set({ systemMonitoringEnabled: enabled });
    window.electronAPI.config.set('systemMonitoringEnabled', enabled);
  },

  setColorScheme: async (scheme: MantineColorScheme) => {
    set({
      rawColorScheme: scheme,
      resolvedColorScheme: resolveColorScheme(scheme),
    });
    await window.electronAPI.app.setColorScheme(scheme);
  },

  loadPreferences: async () => {
    const [frontendPref, imageGenFrontendPref, colorScheme, systemMonitoring] =
      await Promise.all([
        window.electronAPI.config.get(
          'frontendPreference'
        ) as Promise<FrontendPreference>,
        window.electronAPI.config.get(
          'imageGenerationFrontendPreference'
        ) as Promise<ImageGenerationFrontendPreference>,
        window.electronAPI.app.getColorScheme(),
        window.electronAPI.config.get(
          'systemMonitoringEnabled'
        ) as Promise<boolean>,
      ]);

    set({
      frontendPreference: frontendPref || 'koboldcpp',
      imageGenerationFrontendPreference: imageGenFrontendPref || 'match',
      rawColorScheme: colorScheme || 'auto',
      resolvedColorScheme: resolveColorScheme(colorScheme || 'auto'),
      systemMonitoringEnabled: systemMonitoring ?? true,
    });
  },
}));

void usePreferencesStore.getState().loadPreferences();
