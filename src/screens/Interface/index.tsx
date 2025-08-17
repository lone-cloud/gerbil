import { useState, useCallback } from 'react';
import { Card, Container } from '@mantine/core';
import { ServerTab } from '@/screens/Interface/ServerTab';
import { TerminalTab } from '@/screens/Interface/TerminalTab';

interface InterfaceScreenProps {
  activeTab?: string | null;
  onTabChange?: (tab: string | null) => void;
  isImageGenerationMode?: boolean;
}

export const InterfaceScreen = ({
  activeTab,
  onTabChange,
  isImageGenerationMode = false,
}: InterfaceScreenProps) => {
  const [serverUrl, setServerUrl] = useState<string>('');
  const [isServerReady, setIsServerReady] = useState<boolean>(false);

  const handleServerReady = useCallback(
    (url: string) => {
      setServerUrl(url);
      setIsServerReady(true);
      if (onTabChange) {
        onTabChange(isImageGenerationMode ? 'image' : 'chat');
      }
    },
    [onTabChange, isImageGenerationMode]
  );

  return (
    <Container size="l" style={{ height: '85vh' }}>
      <Card
        withBorder
        radius="md"
        p="0"
        style={{ height: 'calc(90vh - 32px)' }}
      >
        <div style={{ height: '100%' }}>
          <div
            style={{
              height: '100%',
              display: activeTab === 'chat' ? 'block' : 'none',
            }}
          >
            <ServerTab
              serverUrl={serverUrl}
              isServerReady={isServerReady}
              mode={isImageGenerationMode ? 'image-generation' : 'chat'}
            />
          </div>
          <div
            style={{
              height: '100%',
              display: activeTab === 'image' ? 'block' : 'none',
            }}
          >
            <ServerTab
              serverUrl={serverUrl}
              isServerReady={isServerReady}
              mode="image-generation"
            />
          </div>
          <div
            style={{
              display: activeTab === 'terminal' ? 'block' : 'none',
            }}
          >
            <TerminalTab onServerReady={handleServerReady} />
          </div>
        </div>
      </Card>
    </Container>
  );
};
