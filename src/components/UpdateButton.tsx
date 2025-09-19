import { ActionIcon, Tooltip } from '@mantine/core';
import { CircleFadingArrowUp, Download } from 'lucide-react';
import { useAppUpdateChecker } from '@/hooks/useAppUpdateChecker';
import { TITLEBAR_HEIGHT } from '@/constants';
import { useState, type MouseEvent } from 'react';

export const UpdateButton = () => {
  const {
    hasUpdate,
    releaseUrl,
    canAutoUpdate,
    isUpdateDownloaded,
    isDownloading,
    downloadUpdate,
    installUpdate,
  } = useAppUpdateChecker();

  const [showDownload, setShowDownload] = useState(false);

  if (!hasUpdate) return null;

  let color: 'green' | 'blue' | 'orange' = 'orange';
  let label = 'Update available';
  let onClick: (() => void) | undefined;
  let icon = <CircleFadingArrowUp size="1.25rem" />;

  if (isUpdateDownloaded) {
    color = 'green';
    label = 'Install update and restart';
    onClick = installUpdate;
  } else if (isDownloading) {
    color = 'blue';
    label = 'Downloading update...';
    icon = <Download size="1.25rem" />;
  } else if (showDownload && canAutoUpdate) {
    color = 'blue';
    label = 'Download and install update';
    onClick = () => {
      downloadUpdate();
      setShowDownload(false);
    };
    icon = <Download size="1.25rem" />;
  } else {
    color = 'orange';
    label = canAutoUpdate
      ? 'Update available - Click to view, right-click to download'
      : 'Update available - Click to view';
    onClick = () => {
      if (releaseUrl) {
        window.electronAPI.app.openExternal(releaseUrl);
      }
    };
  }

  const handleContextMenu = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (canAutoUpdate && !isDownloading && !isUpdateDownloaded) {
      setShowDownload(true);
      downloadUpdate();
    }
  };

  return (
    <Tooltip label={label} position="bottom">
      <ActionIcon
        component="button"
        variant="subtle"
        color={color}
        size={TITLEBAR_HEIGHT}
        aria-label={label}
        tabIndex={-1}
        onClick={onClick}
        onContextMenu={handleContextMenu}
        style={{
          borderRadius: 0,
          margin: 0,
        }}
      >
        {icon}
      </ActionIcon>
    </Tooltip>
  );
};
