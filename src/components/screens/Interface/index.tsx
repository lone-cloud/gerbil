import { useEffect, useRef } from 'react';

import { ServerTab } from '@/components/screens/Interface/ServerTab';
import { TerminalTab } from '@/components/screens/Interface/TerminalTab';
import type { TerminalTabRef } from '@/components/screens/Interface/TerminalTab';
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
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
      }}
    >
      <div
        style={{
          display: activeTab === 'chat-text' || activeTab === 'chat-image' ? 'block' : 'none',
          flex: 1,
        }}
      >
        <ServerTab isServerReady={isServerReady} activeTab={activeTab ?? undefined} />
      </div>
      <div
        style={{
          display: activeTab === 'terminal' ? 'block' : 'none',
          flex: 1,
        }}
      >
        <TerminalTab ref={terminalTabRef} />
      </div>
    </div>
  );
};
