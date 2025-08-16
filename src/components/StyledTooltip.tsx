import type { ReactNode } from 'react';
import { Tooltip, useMantineColorScheme } from '@mantine/core';
import type { TooltipProps } from '@mantine/core';

interface StyledTooltipProps extends Omit<TooltipProps, 'styles' | 'color'> {
  children: ReactNode;
}

export const StyledTooltip = ({ children, ...props }: StyledTooltipProps) => {
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <Tooltip
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
      {...props}
    >
      {children}
    </Tooltip>
  );
};
