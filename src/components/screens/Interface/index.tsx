import { useState, useCallback } from 'react';
import { ServerTab } from '@/components/screens/Interface/ServerTab';
import { TerminalTab } from '@/components/screens/Interface/TerminalTab';

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
    <div
      style={{
        height: '100%',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          flex: 1,
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
          flex: 1,
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
          flex: 1,
          display: activeTab === 'terminal' ? 'block' : 'none',
        }}
      >
        <TerminalTab onServerReady={handleServerReady} />
      </div>
    </div>
  );
};
