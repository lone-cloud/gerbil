import { Box, Text, Stack } from '@mantine/core';
import {
  SILLYTAVERN,
  OPENWEBUI,
  FRONTENDS,
  TITLEBAR_HEIGHT,
} from '@/constants';
import { useLaunchConfigStore } from '@/stores/launchConfig';
import type { FrontendPreference } from '@/types';

interface ServerTabProps {
  serverUrl?: string;
  isServerReady?: boolean;
  frontendPreference?: FrontendPreference;
}

export const ServerTab = ({
  serverUrl,
  isServerReady,
  frontendPreference = 'koboldcpp',
}: ServerTabProps) => {
  const { isImageGenerationMode } = useLaunchConfigStore();

  if (!isServerReady || !serverUrl) {
    return (
      <Box
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Stack align="center" gap="md" mt="xl">
          <Text c="dimmed" size="lg">
            Waiting for the KoboldCpp server to start...
          </Text>
          <Text c="dimmed" size="sm">
            The {isImageGenerationMode ? 'image generation' : 'chat'} interface
            will load automatically when ready
          </Text>
        </Stack>
      </Box>
    );
  }

  let iframeUrl: string;
  let title: string;

  if (frontendPreference === 'sillytavern') {
    iframeUrl = SILLYTAVERN.PROXY_URL;
    title = FRONTENDS.SILLYTAVERN;
  } else if (frontendPreference === 'openwebui' && !isImageGenerationMode) {
    iframeUrl = OPENWEBUI.URL;
    title = FRONTENDS.OPENWEBUI;
  } else {
    iframeUrl = isImageGenerationMode ? `${serverUrl}/sdui` : serverUrl;
    title = isImageGenerationMode
      ? FRONTENDS.STABLE_UI
      : FRONTENDS.KOBOLDAI_LITE;
  }

  return (
    <Box
      style={{
        width: '100%',
        height: `calc(100vh - ${TITLEBAR_HEIGHT})`,
        overflow: 'hidden',
      }}
    >
      <iframe
        src={iframeUrl}
        title={title}
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
          borderRadius: 'inherit',
        }}
        allow="clipboard-read; clipboard-write"
      />
    </Box>
  );
};
