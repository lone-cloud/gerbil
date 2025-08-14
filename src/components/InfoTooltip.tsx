import { ActionIcon, Tooltip, useMantineColorScheme } from '@mantine/core';
import { Info } from 'lucide-react';

interface InfoTooltipProps {
  label: string;
  multiline?: boolean;
  width?: number;
}

export const InfoTooltip = ({
  label,
  multiline = true,
  width = 300,
}: InfoTooltipProps) => {
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <Tooltip
      label={label}
      multiline={multiline}
      w={width}
      withArrow
      color={isDark ? 'dark' : 'gray'}
      styles={{
        tooltip: {
          backgroundColor: isDark
            ? 'var(--mantine-color-dark-6)'
            : 'var(--mantine-color-gray-1)',
          color: isDark
            ? 'var(--mantine-color-gray-0)'
            : 'var(--mantine-color-dark-7)',
          border: isDark
            ? '1px solid var(--mantine-color-dark-4)'
            : '1px solid var(--mantine-color-gray-3)',
        },
      }}
    >
      <ActionIcon variant="subtle" size="xs" color="gray">
        <Info size={14} />
      </ActionIcon>
    </Tooltip>
  );
};
