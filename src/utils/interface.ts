import type { FrontendPreference, InterfaceTab } from '@/types';
import { FRONTENDS, SILLYTAVERN, OPENWEBUI, COMFYUI } from '@/constants';

export interface InterfaceOption {
  value: InterfaceTab | 'eject';
  label: string;
}

export interface InterfaceSelectionParams {
  frontendPreference: FrontendPreference;
  isTextMode: boolean;
  isImageGenerationMode: boolean;
}

export function getAvailableInterfaceOptions({
  frontendPreference,
  isTextMode,
  isImageGenerationMode,
}: InterfaceSelectionParams) {
  const chatItems: InterfaceOption[] = [];

  if (
    frontendPreference === 'sillytavern' ||
    frontendPreference === 'openwebui'
  ) {
    if (isTextMode || isImageGenerationMode) {
      const label =
        frontendPreference === 'sillytavern'
          ? FRONTENDS.SILLYTAVERN
          : FRONTENDS.OPENWEBUI;

      chatItems.push({
        value: 'chat-text',
        label,
      });
    }
  } else {
    if (isTextMode) {
      chatItems.push({
        value: 'chat-text',
        label: FRONTENDS.KOBOLDAI_LITE,
      });
    }

    if (isImageGenerationMode) {
      const imageLabel =
        frontendPreference === 'comfyui'
          ? FRONTENDS.COMFYUI
          : FRONTENDS.STABLE_UI;

      chatItems.push({
        value: 'chat-image',
        label: imageLabel,
      });
    }
  }

  return [
    ...chatItems,
    { value: 'terminal', label: 'Terminal' },
    { value: 'eject', label: 'Eject' },
  ] as const;
}

export function getDefaultInterfaceTab({
  frontendPreference,
  isTextMode,
  isImageGenerationMode,
}: InterfaceSelectionParams) {
  if (
    frontendPreference === 'sillytavern' ||
    frontendPreference === 'openwebui'
  ) {
    return 'chat-text';
  }

  if (frontendPreference === 'comfyui' && isImageGenerationMode) {
    return 'chat-image';
  }

  if (isTextMode) {
    return 'chat-text';
  }

  if (isImageGenerationMode) {
    return 'chat-image';
  }

  return 'chat-text';
}

export interface ServerInterfaceInfo {
  url: string;
  title: string;
}

export function getServerInterfaceInfo({
  frontendPreference,
  isImageGenerationMode,
  serverUrl,
}: {
  frontendPreference: FrontendPreference;
  isImageGenerationMode: boolean;
  serverUrl: string;
}) {
  if (frontendPreference === 'sillytavern') {
    return {
      url: SILLYTAVERN.PROXY_URL,
      title: FRONTENDS.SILLYTAVERN,
    };
  }

  if (frontendPreference === 'openwebui') {
    return {
      url: OPENWEBUI.URL,
      title: FRONTENDS.OPENWEBUI,
    };
  }

  if (frontendPreference === 'comfyui' && isImageGenerationMode) {
    return {
      url: COMFYUI.URL,
      title: FRONTENDS.COMFYUI,
    };
  }

  return {
    url: isImageGenerationMode ? `${serverUrl}/sdui` : serverUrl,
    title: isImageGenerationMode
      ? FRONTENDS.STABLE_UI
      : FRONTENDS.KOBOLDAI_LITE,
  };
}
