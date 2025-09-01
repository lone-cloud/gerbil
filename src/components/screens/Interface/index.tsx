import { useState, useCallback } from 'react';
import { ServerTab } from '@/components/screens/Interface/ServerTab';
import { TerminalTab } from '@/components/screens/Interface/TerminalTab';
import type { InterfaceTab, FrontendPreference } from '@/types';

interface InterfaceScreenProps {
  activeTab?: InterfaceTab | null;
  onTabChange?: (tab: InterfaceTab) => void;
  frontendPreference?: FrontendPreference;
}

export const InterfaceScreen = ({
  activeTab,
  onTabChange,
  frontendPreference = 'koboldcpp',
}: InterfaceScreenProps) => {
  const [serverUrl, setServerUrl] = useState<string>('');
  const [isServerReady, setIsServerReady] = useState<boolean>(false);

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
          frontendPreference={frontendPreference}
        />
      </div>
      <div
        style={{
          flex: 1,
          display: activeTab === 'terminal' ? 'block' : 'none',
        }}
      >
        <TerminalTab
          onServerReady={handleServerReady}
          frontendPreference={frontendPreference}
        />
      </div>
    </div>
  );
};
