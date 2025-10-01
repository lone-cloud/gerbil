import { Switch as MantineSwitch, type SwitchProps } from '@mantine/core';

export const Switch = (props: SwitchProps) => (
  <MantineSwitch
    {...props}
    styles={{
      track: { transition: 'none' },
      thumb: { transition: 'none' },
    }}
  />
);
