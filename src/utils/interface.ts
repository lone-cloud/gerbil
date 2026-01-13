import { FRONTENDS, OPENWEBUI, SILLYTAVERN } from '@/constants';
import { PROXY } from '@/constants/proxy';
import type { FrontendPreference, ImageGenerationFrontendPreference, InterfaceTab } from '@/types';

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
    imageGenerationFrontendPreference === 'builtin' ? 'koboldcpp' : frontendPreference;

  if (frontendPreference === 'sillytavern' || frontendPreference === 'openwebui') {
    if (isTextMode || (isImageGenerationMode && effectiveImageFrontend === frontendPreference)) {
      const label =
        frontendPreference === 'sillytavern' ? FRONTENDS.SILLYTAVERN : FRONTENDS.OPENWEBUI;

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
  } else if (frontendPreference === 'llamacpp') {
    if (isTextMode) {
      chatItems.push({
        value: 'chat-text',
        label: FRONTENDS.LLAMA_CPP,
      });
    }
  }

  if (isImageGenerationMode) {
    if (effectiveImageFrontend === 'koboldcpp' || effectiveImageFrontend === 'llamacpp') {
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
    imageGenerationFrontendPreference === 'builtin' ? 'koboldcpp' : frontendPreference;

  if (frontendPreference === 'sillytavern' || frontendPreference === 'openwebui') {
    if (isImageGenerationMode && effectiveImageFrontend !== frontendPreference) {
      return 'chat-image';
    }
    return 'chat-text';
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

export interface ServerInterfaceParams {
  frontendPreference: FrontendPreference;
  imageGenerationFrontendPreference?: ImageGenerationFrontendPreference;
  isImageGenerationMode: boolean;
}

export function getServerInterfaceInfo({
  frontendPreference,
  imageGenerationFrontendPreference = 'match',
  isImageGenerationMode,
}: ServerInterfaceParams) {
  const proxyUrl = PROXY.URL;

  if (isImageGenerationMode && imageGenerationFrontendPreference === 'builtin') {
    return {
      url: `${proxyUrl}/sdui`,
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

  if (frontendPreference === 'llamacpp') {
    return {
      url: isImageGenerationMode ? `${proxyUrl}/sdui` : `${proxyUrl}/lcpp`,
      title: isImageGenerationMode ? FRONTENDS.STABLE_UI : FRONTENDS.LLAMA_CPP,
    };
  }

  return {
    url: isImageGenerationMode ? `${proxyUrl}/sdui` : proxyUrl,
    title: isImageGenerationMode ? FRONTENDS.STABLE_UI : FRONTENDS.KOBOLDAI_LITE,
  };
}

export function getTunnelInterfaceUrl(
  tunnelBaseUrl: string,
  params: Omit<ServerInterfaceParams, 'frontendPreference'> & {
    frontendPreference: Exclude<FrontendPreference, 'sillytavern' | 'openwebui'>;
  }
) {
  const { frontendPreference, imageGenerationFrontendPreference, isImageGenerationMode } = params;

  if (isImageGenerationMode && imageGenerationFrontendPreference === 'builtin') {
    return `${tunnelBaseUrl}/sdui`;
  }

  if (frontendPreference === 'llamacpp') {
    return isImageGenerationMode ? `${tunnelBaseUrl}/sdui` : `${tunnelBaseUrl}/lcpp`;
  }

  return isImageGenerationMode ? `${tunnelBaseUrl}/sdui` : tunnelBaseUrl;
}
