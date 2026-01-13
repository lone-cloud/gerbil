import { Box, Stack, Text } from '@mantine/core';
import { useMemo } from 'react';
import { STATUSBAR_HEIGHT, TITLEBAR_HEIGHT } from '@/constants';
import { useLaunchConfigStore } from '@/stores/launchConfig';
import { usePreferencesStore } from '@/stores/preferences';
import { getServerInterfaceInfo } from '@/utils/interface';

interface ServerTabProps {
  isServerReady?: boolean;
  activeTab?: string;
}

export const ServerTab = ({ isServerReady, activeTab }: ServerTabProps) => {
  const { isImageGenerationMode } = useLaunchConfigStore();
  const { frontendPreference, imageGenerationFrontendPreference } = usePreferencesStore();

  const effectiveImageMode =
    activeTab === 'chat-image' ? true : activeTab === 'chat-text' ? false : isImageGenerationMode;

  const { url: iframeUrl, title } = useMemo(
    () =>
      getServerInterfaceInfo({
        frontendPreference,
        imageGenerationFrontendPreference,
        isImageGenerationMode: effectiveImageMode,
      }),
    [frontendPreference, imageGenerationFrontendPreference, effectiveImageMode]
  );

  if (!isServerReady) {
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
            Waiting for the server to start...
          </Text>
          <Text c="dimmed" size="sm">
            The {title.toLowerCase().includes('ui') ? 'image generation' : 'chat'} interface will
            load automatically when ready
          </Text>
        </Stack>
      </Box>
    );
  }

  return (
    <Box
      style={{
        width: '100%',
        height: `calc(100vh - ${TITLEBAR_HEIGHT} - ${STATUSBAR_HEIGHT})`,
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
        allow="clipboard-read; clipboard-write; fullscreen; microphone; geolocation; camera; autoplay"
      />
    </Box>
  );
};
