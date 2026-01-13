import { useEffect, useRef } from 'react';
import { ServerTab } from '@/components/screens/Interface/ServerTab';
import { TerminalTab, type TerminalTabRef } from '@/components/screens/Interface/TerminalTab';
import type { InterfaceTab } from '@/types';

interface InterfaceScreenProps {
  activeTab?: InterfaceTab | null;
  isServerReady: boolean;
}

export const InterfaceScreen = ({ activeTab, isServerReady }: InterfaceScreenProps) => {
  const terminalTabRef = useRef<TerminalTabRef>(null);

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
          display: activeTab === 'chat-text' || activeTab === 'chat-image' ? 'block' : 'none',
        }}
      >
        <ServerTab isServerReady={isServerReady} activeTab={activeTab || undefined} />
      </div>
      <div
        style={{
          flex: 1,
          display: activeTab === 'terminal' ? 'block' : 'none',
        }}
      >
        <TerminalTab ref={terminalTabRef} />
      </div>
    </div>
  );
};
