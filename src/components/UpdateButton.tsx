import { ActionIcon } from '@mantine/core';
import { CircleFadingArrowUp } from 'lucide-react';
import { useAppUpdateChecker } from '@/hooks/useAppUpdateChecker';
import { TITLEBAR_HEIGHT } from '@/constants';

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

  if (!hasUpdate) return null;

  const isButton = canAutoUpdate;
  const isLink = !canAutoUpdate && releaseUrl;

  let color: 'green' | 'blue' | 'orange' = 'orange';
  let label = 'New release available';
  let onClick: (() => void) | undefined;

  if (isUpdateDownloaded) {
    color = 'green';
    label = 'Install update and restart';
    onClick = installUpdate;
  } else if (isDownloading) {
    color = 'blue';
    label = 'Downloading update...';
  } else if (canAutoUpdate) {
    color = 'blue';
    label = 'Download and install update';
    onClick = downloadUpdate;
  }

  return (
    <ActionIcon
      component={(isButton ? 'button' : 'a') as 'button' | 'a'}
      href={isLink ? releaseUrl : undefined}
      target={isLink ? '_blank' : undefined}
      rel={isLink ? 'noopener noreferrer' : undefined}
      variant="subtle"
      color={color}
      size={TITLEBAR_HEIGHT}
      aria-label={label}
      tabIndex={-1}
      onClick={onClick}
      style={{
        borderRadius: 0,
        margin: 0,
      }}
    >
      <CircleFadingArrowUp size="1.25rem" />
    </ActionIcon>
  );
};
