import type { SelectProps } from '@mantine/core';
import { Select as MantineSelect } from '@mantine/core';

export const Select = ({
  allowDeselect = false,
  clearable = false,
  size = 'sm',
  ...props
}: SelectProps) => (
  <MantineSelect allowDeselect={allowDeselect} clearable={clearable} size={size} {...props} />
);
