import { Button, Tooltip, ActionIcon } from '@mantine/core';
import { Activity } from 'lucide-react';

interface PerformanceBadgeProps {
  label?: string;
  value?: string;
  tooltipLabel: string;
  iconOnly?: boolean;
}

export const PerformanceBadge = ({
  label,
  value,
  tooltipLabel,
  iconOnly = false,
}: PerformanceBadgeProps) => {
  const handlePerformanceClick = async () => {
    const result = await window.electronAPI.app.openPerformanceManager();

    if (!result.success) {
      window.electronAPI.logs.logError(
        `Failed to open performance manager: ${result.error}`
      );
    }
  };

  if (iconOnly) {
    return (
      <Tooltip label={tooltipLabel} position="top">
        <ActionIcon size="sm" variant="subtle" onClick={handlePerformanceClick}>
          <Activity size="1.125rem" />
        </ActionIcon>
      </Tooltip>
    );
  }

  return (
    <Tooltip label={tooltipLabel} position="top">
      <Button
        size="xs"
        variant="light"
        style={{
          minWidth: '5rem',
          textAlign: 'center',
          height: 'auto',
          padding: '0.25rem 0.5rem',
          margin: '0.125rem 0',
          borderRadius: '0.75rem',
          fontSize: '0.7em',
          fontWeight: 500,
        }}
        onClick={handlePerformanceClick}
      >
        {label}: {value}
      </Button>
    </Tooltip>
  );
};
