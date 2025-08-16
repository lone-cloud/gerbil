import { useRef } from 'react';
import { Box, Text, Stack } from '@mantine/core';

interface ImageGenerationTabProps {
  serverUrl?: string;
  isServerReady?: boolean;
}

export const ImageGenerationTab = ({
  serverUrl,
  isServerReady,
}: ImageGenerationTabProps) => {
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
            The image generation interface will load automatically when ready
          </Text>
        </Stack>
      </Box>
    );
  }

  const imageGenerationUrl = `${serverUrl}/sdapi/v1`;

  return (
    <Box style={{ width: '100%', height: '100%', overflow: 'hidden' }}>
      <iframe
        ref={iframeRef}
        src={imageGenerationUrl}
        title="KoboldCpp Image Generation Interface"
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
