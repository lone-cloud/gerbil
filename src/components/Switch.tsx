import { Switch as MantineSwitch } from '@mantine/core';
import type { SwitchProps } from '@mantine/core';

export const Switch = (props: SwitchProps) => (
  <MantineSwitch
    {...props}
    styles={{
      thumb: { transition: 'none' },
      track: { transition: 'none' },
    }}
  />
);
