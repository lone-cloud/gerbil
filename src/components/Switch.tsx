import { Switch as MantineSwitch } from '@mantine/core';
import type { SwitchProps } from '@mantine/core';

export const Switch = (props: SwitchProps) => (
  <MantineSwitch
    {...props}
    styles={{
      thumb: { transition: 'left 100ms ease, background-color 100ms ease' },
      track: { transition: 'background-color 100ms ease' },
    }}
  />
);
