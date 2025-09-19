import { useEffect, useState, useCallback } from 'react';
import type { FrontendPreference } from '@/types';

export function useFrontendPreference() {
  const [frontendPreference, setFrontendPreferenceState] =
    useState<FrontendPreference>('koboldcpp');

  useEffect(() => {
    const loadFromConfig = async () => {
      const preference = (await window.electronAPI.config.get(
        'frontendPreference'
      )) as FrontendPreference;

      setFrontendPreferenceState(preference || 'koboldcpp');
    };

    loadFromConfig();
  }, []);

  const setFrontendPreference = useCallback(
    (preference: FrontendPreference) => {
      setFrontendPreferenceState(preference);
      window.electronAPI.config.set('frontendPreference', preference);
    },
    []
  );

  return {
    frontendPreference,
    setFrontendPreference,
  };
}
