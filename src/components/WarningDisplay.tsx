import { Box, Group, List, Tooltip } from '@mantine/core';
import { AlertTriangle, Info } from 'lucide-react';
import type { ReactNode } from 'react';

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

  const warningMessages = warnings.filter((w) => w.type === 'warning');
  const infoMessages = warnings.filter((w) => w.type === 'info');

  return (
    <Group gap="xs" align="center">
      {warningMessages.length > 0 && (
        <Tooltip
          label={
            warningMessages.length === 1 ? (
              warningMessages[0].message
            ) : (
              <List size="sm" spacing={4}>
                {warningMessages.map((warning) => (
                  <List.Item key={warning.message}>{warning.message}</List.Item>
                ))}
              </List>
            )
          }
          multiline
          maw={320}
        >
          <Box
            component="span"
            tabIndex={0}
            role="img"
            aria-label="Warning"
            style={{ display: 'inline-flex', cursor: 'default' }}
          >
            <AlertTriangle size={18} color="var(--mantine-color-orange-6)" strokeWidth={2} />
          </Box>
        </Tooltip>
      )}
      {infoMessages.length > 0 && (
        <Tooltip
          label={
            infoMessages.length === 1 ? (
              infoMessages[0].message
            ) : (
              <List size="sm" spacing={4}>
                {infoMessages.map((info) => (
                  <List.Item key={info.message}>{info.message}</List.Item>
                ))}
              </List>
            )
          }
          multiline
          maw={320}
        >
          <Box
            component="span"
            tabIndex={0}
            role="img"
            aria-label="Info"
            style={{ display: 'inline-flex', cursor: 'default' }}
          >
            <Info size={18} color="var(--mantine-color-brand-5)" strokeWidth={2} />
          </Box>
        </Tooltip>
      )}
      {children}
    </Group>
  );
};
