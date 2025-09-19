import { create } from 'zustand';
import type { FrontendPreference } from '@/types';

interface FrontendPreferenceStore {
  frontendPreference: FrontendPreference;
  setFrontendPreference: (preference: FrontendPreference) => void;
  loadFrontendPreference: () => Promise<void>;
}

export const useFrontendPreferenceStore = create<FrontendPreferenceStore>(
  (set) => ({
    frontendPreference: 'koboldcpp',

    setFrontendPreference: (preference: FrontendPreference) => {
      set({ frontendPreference: preference });
      window.electronAPI.config.set('frontendPreference', preference);
    },

    loadFrontendPreference: async () => {
      const preference = (await window.electronAPI.config.get(
        'frontendPreference'
      )) as FrontendPreference;

      set({ frontendPreference: preference || 'koboldcpp' });
    },
  })
);
