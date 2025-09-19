import { create } from 'zustand';
import type { FrontendPreference } from '@/types';

interface FrontendPreferenceState {
  frontendPreference: FrontendPreference;
  setFrontendPreference: (preference: FrontendPreference) => void;
  loadFromConfig: () => Promise<void>;
}

export const useFrontendPreferenceStore = create<FrontendPreferenceState>()(
  (set) => ({
    frontendPreference: 'koboldcpp',

    setFrontendPreference: (preference: FrontendPreference) => {
      set({ frontendPreference: preference });

      window.electronAPI.config.set('frontendPreference', preference);
    },

    loadFromConfig: async () => {
      const preference = (await window.electronAPI.config.get(
        'frontendPreference'
      )) as FrontendPreference;

      set({ frontendPreference: preference || 'koboldcpp' });
    },
  })
);
