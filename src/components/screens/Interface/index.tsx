import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { ServerTab } from '@/components/screens/Interface/ServerTab';
import {
  TerminalTab,
  type TerminalTabRef,
} from '@/components/screens/Interface/TerminalTab';
import { useLaunchConfigStore } from '@/stores/launchConfig';
import { usePreferencesStore } from '@/stores/preferences';
import { getDefaultInterfaceTab } from '@/utils/interface';
import type { InterfaceTab } from '@/types';

interface InterfaceScreenProps {
  activeTab?: InterfaceTab | null;
  onTabChange?: (tab: InterfaceTab) => void;
}

export const InterfaceScreen = ({
  activeTab,
  onTabChange,
}: InterfaceScreenProps) => {
  const [serverUrl, setServerUrl] = useState('');
  const [isServerReady, setIsServerReady] = useState(false);
  const terminalTabRef = useRef<TerminalTabRef>(null);

  const { isTextMode, isImageGenerationMode } = useLaunchConfigStore();
  const { frontendPreference, imageGenerationFrontendPreference } =
    usePreferencesStore();

  const defaultInterfaceTab = useMemo(
    () =>
      getDefaultInterfaceTab({
        frontendPreference,
        imageGenerationFrontendPreference,
        isTextMode,
        isImageGenerationMode,
      }),
    [
      frontendPreference,
      imageGenerationFrontendPreference,
      isTextMode,
      isImageGenerationMode,
    ]
  );

  const handleServerReady = useCallback(
    (url: string) => {
      setServerUrl(url);
      setIsServerReady(true);
      if (onTabChange) {
        onTabChange(defaultInterfaceTab);
      }
    },
    [onTabChange, defaultInterfaceTab]
  );

  useEffect(() => {
    if (activeTab === 'terminal' && terminalTabRef.current) {
      terminalTabRef.current.scrollToBottom();
    }
  }, [activeTab]);

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
          display:
            activeTab === 'chat-text' || activeTab === 'chat-image'
              ? 'block'
              : 'none',
        }}
      >
        <ServerTab
          serverUrl={serverUrl}
          isServerReady={isServerReady}
          activeTab={activeTab || undefined}
        />
      </div>
      <div
        style={{
          flex: 1,
          display: activeTab === 'terminal' ? 'block' : 'none',
        }}
      >
        <TerminalTab ref={terminalTabRef} onServerReady={handleServerReady} />
      </div>
    </div>
  );
};
