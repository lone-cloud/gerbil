import { useState, useEffect } from 'react';
import { useLaunchConfigStore } from '@/stores/launchConfig';
import {
  getAvailableInterfaceOptions,
  getDefaultInterfaceTab,
  getServerInterfaceInfo,
} from '@/utils/interface';
import { safeExecute } from '@/utils/logger';
import type { FrontendPreference } from '@/types';

export function useFrontendPreference() {
  const [frontendPreference, setFrontendPreference] =
    useState<FrontendPreference>('koboldcpp');

  useEffect(() => {
    const loadPreference = async () => {
      await safeExecute(async () => {
        const preference = (await window.electronAPI.config.get(
          'frontendPreference'
        )) as FrontendPreference;

        setFrontendPreference(preference || 'koboldcpp');
      }, 'Error loading frontend preference:');
    };

    loadPreference();
  }, []);

  const updateFrontendPreference = async (preference: FrontendPreference) => {
    setFrontendPreference(preference);
    await safeExecute(async () => {
      await window.electronAPI.config.set('frontendPreference', preference);
    }, 'Error saving frontend preference:');
  };

  return {
    frontendPreference,
    setFrontendPreference: updateFrontendPreference,
  };
}

export function useInterfaceOptions() {
  const { isTextMode, isImageGenerationMode } = useLaunchConfigStore();
  const { frontendPreference } = useFrontendPreference();

  return getAvailableInterfaceOptions({
    frontendPreference,
    isTextMode,
    isImageGenerationMode,
  });
}

export function useDefaultInterfaceTab() {
  const { isTextMode, isImageGenerationMode } = useLaunchConfigStore();
  const { frontendPreference } = useFrontendPreference();

  return getDefaultInterfaceTab({
    frontendPreference,
    isTextMode,
    isImageGenerationMode,
  });
}

export function useServerInterfaceInfo(serverUrl: string, activeTab?: string) {
  const { isImageGenerationMode } = useLaunchConfigStore();
  const { frontendPreference } = useFrontendPreference();

  const effectiveImageMode =
    activeTab === 'chat-image'
      ? true
      : activeTab === 'chat-text'
        ? false
        : isImageGenerationMode;

  return getServerInterfaceInfo({
    frontendPreference,
    isImageGenerationMode: effectiveImageMode,
    serverUrl,
  });
}
