import { Box, Text, Stack } from '@mantine/core';
import { useMemo } from 'react';
import { useLaunchConfigStore } from '@/stores/launchConfig';
import { usePreferencesStore } from '@/stores/preferences';
import { getServerInterfaceInfo } from '@/utils/interface';
import { TITLEBAR_HEIGHT, STATUSBAR_HEIGHT } from '@/constants';

interface ServerTabProps {
  serverUrl?: string;
  isServerReady?: boolean;
  activeTab?: string;
}

export const ServerTab = ({
  serverUrl,
  isServerReady,
  activeTab,
}: ServerTabProps) => {
  const { isImageGenerationMode } = useLaunchConfigStore();
  const { frontendPreference } = usePreferencesStore();

  const effectiveImageMode =
    activeTab === 'chat-image'
      ? true
      : activeTab === 'chat-text'
        ? false
        : isImageGenerationMode;

  const { url: iframeUrl, title } = useMemo(
    () =>
      getServerInterfaceInfo({
        frontendPreference,
        isImageGenerationMode: effectiveImageMode,
        serverUrl: serverUrl || '',
      }),
    [frontendPreference, effectiveImageMode, serverUrl]
  );

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
            Waiting for the server to start...
          </Text>
          <Text c="dimmed" size="sm">
            The{' '}
            {title.toLowerCase().includes('ui') ||
            title.toLowerCase().includes('comfy')
              ? 'image generation'
              : 'chat'}{' '}
            interface will load automatically when ready
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
