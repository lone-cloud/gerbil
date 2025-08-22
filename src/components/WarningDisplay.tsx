import { ReactNode } from 'react';
import { Group, useMantineTheme, List, Tooltip } from '@mantine/core';
import { AlertTriangle, Info } from 'lucide-react';

interface WarningItem {
  type: 'warning' | 'info';
  message: string;
}

interface WarningDisplayProps {
  warnings: WarningItem[];
  children?: ReactNode;
}

export const WarningDisplay = ({ warnings, children }: WarningDisplayProps) => {
  const theme = useMantineTheme();

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
                {warningMessages.map((warning, index) => (
                  <List.Item key={index}>{warning.message}</List.Item>
                ))}
              </List>
            )
          }
          multiline
          maw={320}
        >
          <AlertTriangle size={18} color={theme.colors.orange[6]} />
        </Tooltip>
      )}
      {infoMessages.length > 0 && (
        <Tooltip
          label={
            infoMessages.length === 1 ? (
              infoMessages[0].message
            ) : (
              <List size="sm" spacing={4}>
                {infoMessages.map((info, index) => (
                  <List.Item key={index}>{info.message}</List.Item>
                ))}
              </List>
            )
          }
          multiline
          maw={320}
        >
          <Info size={18} color={theme.colors.blue[6]} />
        </Tooltip>
      )}
      {children}
    </Group>
  );
};
