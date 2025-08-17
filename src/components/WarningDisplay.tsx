import { ReactNode } from 'react';
import { Group } from '@mantine/core';
import { AlertTriangle, Info } from 'lucide-react';
import { StyledTooltip } from '@/components/StyledTooltip';

interface WarningItem {
  type: 'warning' | 'info';
  message: string;
}

interface WarningDisplayProps {
  warnings: WarningItem[];
  children?: ReactNode;
}

export const WarningDisplay = ({ warnings, children }: WarningDisplayProps) => {
  if (warnings.length === 0) {
    return <Group gap="xs">{children}</Group>;
  }

  return (
    <Group gap="xs" align="center">
      {warnings.map((warning, index) => (
        <StyledTooltip key={index} label={warning.message} multiline maw={280}>
          {warning.type === 'warning' ? (
            <AlertTriangle size={18} color="orange" />
          ) : (
            <Info size={18} color="blue" />
          )}
        </StyledTooltip>
      ))}
      {children}
    </Group>
  );
};
