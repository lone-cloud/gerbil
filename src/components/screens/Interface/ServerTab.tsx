import { useRef } from 'react';
import { Box, Text, Stack } from '@mantine/core';
import { SILLYTAVERN, FRONTENDS } from '@/constants';
import type { ServerTabMode, FrontendPreference } from '@/types';

interface ServerTabProps {
  serverUrl?: string;
  isServerReady?: boolean;
  mode: ServerTabMode;
  frontendPreference?: FrontendPreference;
}

export const ServerTab = ({
  serverUrl,
  isServerReady,
  mode,
  frontendPreference = 'koboldcpp',
}: ServerTabProps) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);

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
            The {mode === 'chat' ? 'chat' : 'image generation'} interface will
            load automatically when ready
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
  } else {
    iframeUrl = mode === 'image-generation' ? `${serverUrl}/sdui` : serverUrl;
    title =
      mode === 'image-generation'
        ? FRONTENDS.STABLE_UI
        : FRONTENDS.KOBOLDAI_LITE;
  }

  return (
    <Box
      style={{
        width: '100%',
        height: 'calc(100vh - 2rem)',
        overflow: 'hidden',
      }}
    >
      <iframe
        ref={iframeRef}
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
