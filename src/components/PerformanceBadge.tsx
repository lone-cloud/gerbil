import { Badge, Tooltip } from '@mantine/core';

interface PerformanceBadgeProps {
  label: string;
  value: string;
  tooltipLabel: string;
}

export const PerformanceBadge = ({
  label,
  value,
  tooltipLabel,
}: PerformanceBadgeProps) => {
  const handlePerformanceClick = async () => {
    try {
      const result = await window.electronAPI.app.openPerformanceManager();
      if (!result.success) {
        window.electronAPI.logs.logError(
          `Failed to open performance manager: ${result.error}`
        );
      }
    } catch (error) {
      window.electronAPI.logs.logError(
        'Error opening performance manager',
        error as Error
      );
    }
  };

  return (
    <Tooltip label={tooltipLabel} position="top">
      <Badge
        size="sm"
        variant="light"
        style={{
          minWidth: '5rem',
          textAlign: 'center',
          cursor: 'pointer',
        }}
        onClick={handlePerformanceClick}
      >
        {label}: {value}
      </Badge>
    </Tooltip>
  );
};
