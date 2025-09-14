import { useEffect } from 'react';
import { useLaunchConfigStore } from '@/stores/launchConfig';
import { useFrontendPreferenceStore } from '@/stores/frontendPreference';
import {
  getAvailableInterfaceOptions,
  getDefaultInterfaceTab,
  getServerInterfaceInfo,
} from '@/utils/interface';

export function useFrontendPreference() {
  const { frontendPreference, setFrontendPreference, loadFromConfig } =
    useFrontendPreferenceStore();

  useEffect(() => {
    loadFromConfig();
  }, [loadFromConfig]);

  return {
    frontendPreference,
    setFrontendPreference,
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
