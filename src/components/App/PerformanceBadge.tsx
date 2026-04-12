import { ActionIcon, Button, Tooltip } from '@mantine/core';
import { Activity } from 'lucide-react';

const BADGE_STYLE = {
  borderRadius: '0.75rem',
  fontSize: '0.7em',
  fontWeight: 500,
  height: 'auto',
  margin: '0.125rem 0',
  minWidth: '5rem',
  padding: '0.25rem 0.5rem',
  textAlign: 'center',
} as const;

interface PerformanceBadgeProps {
  label?: string;
  value?: string;
  tooltipLabel: string;
  iconOnly?: boolean;
}

const handlePerformanceClick = async () => {
  const result = await window.electronAPI.app.openPerformanceManager();

  if (!result.success) {
    window.electronAPI.logs.logError(`Failed to open performance manager: ${result.error}`);
  }
};

export const PerformanceBadge = ({
  label,
  value,
  tooltipLabel,
  iconOnly = false,
}: PerformanceBadgeProps) => {
  if (iconOnly) {
    return (
      <Tooltip label={tooltipLabel} position="top">
        <ActionIcon
          size="sm"
          variant="subtle"
          aria-label="View performance details"
          onClick={() => void handlePerformanceClick()}
        >
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
        style={BADGE_STYLE}
        onClick={() => void handlePerformanceClick()}
      >
        {label}: {value}
      </Button>
    </Tooltip>
  );
};
