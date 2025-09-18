import { Badge, Tooltip } from '@mantine/core';
import { useState } from 'react';
import { safeExecute } from '@/utils/logger';

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
  const [isHovered, setIsHovered] = useState(false);

  const handlePerformanceClick = async () => {
    const result = await safeExecute(
      () => window.electronAPI.app.openPerformanceManager(),
      'Failed to open performance manager'
    );

    if (result && !result.success) {
      window.electronAPI.logs.logError(
        `Failed to open performance manager: ${result.error}`
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
          transition: 'background-color 0.2s ease',
          backgroundColor: isHovered
            ? 'var(--mantine-color-blue-1)'
            : undefined,
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={handlePerformanceClick}
      >
        {label}: {value}
      </Badge>
    </Tooltip>
  );
};
