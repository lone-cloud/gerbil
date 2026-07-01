import { ActionIcon, Tooltip } from '@mantine/core';
import { RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { TITLEBAR_HEIGHT } from '@/constants';

export const ReloadButton = () => {
  const [needsReload, setNeedsReload] = useState(false);

  const checkForReload = useCallback(async () => {
    try {
      const result = await window.electronAPI.app.checkForReloadNeeded();
      setNeedsReload(result.needsReload);
    } catch (error) {
      window.electronAPI.logs.logError(
        'Failed to check for reload',
        error instanceof Error ? error : undefined,
      );
    }
  }, []);

  useEffect(() => {
    void checkForReload();

    const onFocus = () => {
      void checkForReload();
    };
    window.addEventListener('focus', onFocus);

    return () => {
      window.removeEventListener('focus', onFocus);
    };
  }, [checkForReload]);

  if (!needsReload) {
    return null;
  }

  return (
    <Tooltip label="App was updated. Click to restart" position="bottom">
      <ActionIcon
        component="button"
        variant="subtle"
        color="orange"
        size={TITLEBAR_HEIGHT}
        aria-label="App was updated. Click to restart"
        onClick={() => void window.electronAPI.app.relaunch()}
        style={{
          borderRadius: 0,
          margin: 0,
        }}
      >
        <RefreshCw size="1.25rem" />
      </ActionIcon>
    </Tooltip>
  );
};
