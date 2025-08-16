import { useRef } from 'react';
import { Box, Text, Stack } from '@mantine/core';

interface ServerTabProps {
  serverUrl?: string;
  isServerReady?: boolean;
  mode: 'chat' | 'image-generation';
}

export const ServerTab = ({
  serverUrl,
  isServerReady,
  mode,
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
        <Stack align="center" gap="md">
          <Text c="dimmed" size="lg">
            Waiting for KoboldCpp server to start...
          </Text>
          <Text c="dimmed" size="sm">
            The {mode === 'chat' ? 'chat' : 'image generation'} interface will
            load automatically when ready
          </Text>
        </Stack>
      </Box>
    );
  }

  const iframeUrl =
    mode === 'image-generation' ? `${serverUrl}/sdapi/v1` : serverUrl;
  const title =
    mode === 'image-generation'
      ? 'KoboldCpp Image Generation Interface'
      : 'KoboldAI Lite Interface';

  return (
    <Box style={{ width: '100%', height: '100%', overflow: 'hidden' }}>
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
