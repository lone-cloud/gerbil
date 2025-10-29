import type {
  FrontendPreference,
  InterfaceTab,
  ImageGenerationFrontendPreference,
} from '@/types';
import { FRONTENDS, SILLYTAVERN, OPENWEBUI, COMFYUI } from '@/constants';

export interface InterfaceOption {
  value: InterfaceTab | 'eject';
  label: string;
}

export interface InterfaceSelectionParams {
  frontendPreference: FrontendPreference;
  imageGenerationFrontendPreference?: ImageGenerationFrontendPreference;
  isTextMode: boolean;
  isImageGenerationMode: boolean;
}

export function getAvailableInterfaceOptions({
  frontendPreference,
  imageGenerationFrontendPreference = 'match',
  isTextMode,
  isImageGenerationMode,
}: InterfaceSelectionParams) {
  const chatItems: InterfaceOption[] = [];

  const effectiveImageFrontend =
    imageGenerationFrontendPreference === 'builtin'
      ? 'koboldcpp'
      : frontendPreference;

  if (
    frontendPreference === 'sillytavern' ||
    frontendPreference === 'openwebui'
  ) {
    if (
      isTextMode ||
      (isImageGenerationMode && effectiveImageFrontend === frontendPreference)
    ) {
      const label =
        frontendPreference === 'sillytavern'
          ? FRONTENDS.SILLYTAVERN
          : FRONTENDS.OPENWEBUI;

      chatItems.push({
        value: 'chat-text',
        label,
      });
    }
  } else if (frontendPreference === 'koboldcpp') {
    if (isTextMode) {
      chatItems.push({
        value: 'chat-text',
        label: FRONTENDS.KOBOLDAI_LITE,
      });
    }
  }

  if (isImageGenerationMode) {
    if (effectiveImageFrontend === 'comfyui') {
      chatItems.push({
        value: 'chat-image',
        label: FRONTENDS.COMFYUI,
      });
    } else if (effectiveImageFrontend === 'koboldcpp') {
      chatItems.push({
        value: 'chat-image',
        label: FRONTENDS.STABLE_UI,
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
  imageGenerationFrontendPreference = 'match',
  isTextMode,
  isImageGenerationMode,
}: InterfaceSelectionParams) {
  const effectiveImageFrontend =
    imageGenerationFrontendPreference === 'builtin'
      ? 'koboldcpp'
      : frontendPreference;

  if (
    frontendPreference === 'sillytavern' ||
    frontendPreference === 'openwebui'
  ) {
    if (
      isImageGenerationMode &&
      effectiveImageFrontend !== frontendPreference
    ) {
      return 'chat-image';
    }
    return 'chat-text';
  }

  if (effectiveImageFrontend === 'comfyui' && isImageGenerationMode) {
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
  imageGenerationFrontendPreference = 'match',
  isImageGenerationMode,
  serverUrl,
}: {
  frontendPreference: FrontendPreference;
  imageGenerationFrontendPreference?: ImageGenerationFrontendPreference;
  isImageGenerationMode: boolean;
  serverUrl: string;
}) {
  if (
    isImageGenerationMode &&
    imageGenerationFrontendPreference === 'builtin'
  ) {
    return {
      url: `${serverUrl}/sdui`,
      title: FRONTENDS.STABLE_UI,
    };
  }

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
