import { Button, Tooltip } from '@mantine/core';

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
    const result = await window.electronAPI.app.openPerformanceManager();

    if (!result.success) {
      window.electronAPI.logs.logError(
        `Failed to open performance manager: ${result.error}`
      );
    }
  };

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
