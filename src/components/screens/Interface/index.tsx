import { useState, useCallback, useEffect } from 'react';
import { ServerTab } from '@/components/screens/Interface/ServerTab';
import { TerminalTab } from '@/components/screens/Interface/TerminalTab';
import type { InterfaceTab, FrontendPreference } from '@/types';

interface InterfaceScreenProps {
  activeTab?: InterfaceTab | null;
  onTabChange?: (tab: InterfaceTab) => void;
  isImageGenerationMode?: boolean;
}

export const InterfaceScreen = ({
  activeTab,
  onTabChange,
  isImageGenerationMode = false,
}: InterfaceScreenProps) => {
  const [serverUrl, setServerUrl] = useState<string>('');
  const [isServerReady, setIsServerReady] = useState<boolean>(false);
  const [frontendPreference, setFrontendPreference] =
    useState<FrontendPreference>('koboldcpp');

  useEffect(() => {
    const loadFrontendPreference = async () => {
      try {
        const frontendPreference = (await window.electronAPI.config.get(
          'frontendPreference'
        )) as FrontendPreference;
        setFrontendPreference(frontendPreference || 'koboldcpp');
      } catch (error) {
        window.electronAPI.logs.logError(
          'Failed to load frontend preference:',
          error as Error
        );
      }
    };

    loadFrontendPreference();
  }, []);

  const handleServerReady = useCallback(
    (url: string) => {
      setServerUrl(url);
      setIsServerReady(true);
      if (onTabChange) {
        onTabChange('chat');
      }
    },
    [onTabChange]
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
          frontendPreference={frontendPreference}
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
