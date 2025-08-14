import { useState, useEffect, useCallback } from 'react';
import { Card, Container } from '@mantine/core';
import { ChatTab } from '@/components/interface/ChatTab';
import { TerminalTab } from '@/components/interface/TerminalTab';

interface InterfaceScreenProps {
  activeTab?: string | null;
  onTabChange?: (tab: string | null) => void;
}

export const InterfaceScreen = ({
  activeTab,
  onTabChange,
}: InterfaceScreenProps) => {
  const [serverOnly, setServerOnly] = useState<boolean>(false);
  const [serverUrl, setServerUrl] = useState<string>('');
  const [isServerReady, setIsServerReady] = useState<boolean>(false);

  const handleServerReady = useCallback(
    (url: string) => {
      setServerUrl(url);
      setIsServerReady(true);

      if (!serverOnly && onTabChange) {
        onTabChange('chat');
      }
    },
    [serverOnly, onTabChange]
  );

  useEffect(() => {
    const loadServerOnlySetting = async () => {
      try {
        const serverOnlyValue = await window.electronAPI.config.getServerOnly();
        setServerOnly(serverOnlyValue);

        if (serverOnlyValue && onTabChange) {
          onTabChange('terminal');
        }
      } catch (error) {
        console.error('Failed to load server-only setting:', error);
      }
    };

    loadServerOnlySetting();
  }, [onTabChange]);

  return (
    <Container size="l" style={{ height: '85vh' }}>
      <Card
        withBorder
        radius="md"
        p="0"
        style={{ height: 'calc(90vh - 32px)' }}
      >
        {serverOnly ? (
          <TerminalTab
            onServerReady={handleServerReady}
            serverOnly={serverOnly}
          />
        ) : (
          <div style={{ height: '100%' }}>
            <div
              style={{
                height: '100%',
                display: activeTab === 'chat' ? 'block' : 'none',
              }}
            >
              <ChatTab serverUrl={serverUrl} isServerReady={isServerReady} />
            </div>
            <div
              style={{
                display: activeTab === 'terminal' ? 'block' : 'none',
              }}
            >
              <TerminalTab
                onServerReady={handleServerReady}
                serverOnly={false}
              />
            </div>
          </div>
        )}
      </Card>
    </Container>
  );
};
