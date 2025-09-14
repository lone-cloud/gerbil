import { create } from 'zustand';
import { safeExecute } from '@/utils/logger';
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

      safeExecute(async () => {
        await window.electronAPI.config.set('frontendPreference', preference);
      }, 'Error saving frontend preference:');
    },

    loadFromConfig: async () => {
      await safeExecute(async () => {
        const preference = (await window.electronAPI.config.get(
          'frontendPreference'
        )) as FrontendPreference;

        set({ frontendPreference: preference || 'koboldcpp' });
      }, 'Error loading frontend preference:');
    },
  })
);
