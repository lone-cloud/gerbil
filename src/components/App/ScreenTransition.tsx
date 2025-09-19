import { ReactNode } from 'react';
import { Transition } from '@mantine/core';

interface ScreenTransitionProps {
  isActive: boolean;
  shouldAnimate: boolean;
  children: ReactNode;
}

export const ScreenTransition = ({
  isActive,
  shouldAnimate,
  children,
}: ScreenTransitionProps) => (
  <Transition
    mounted={isActive}
    transition="fade"
    duration={shouldAnimate ? 100 : 0}
    timingFunction="ease-out"
  >
    {(styles) => (
      <div
        style={{
          ...styles,
        }}
      >
        {children}
      </div>
    )}
  </Transition>
);
