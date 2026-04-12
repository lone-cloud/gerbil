import { Transition } from '@mantine/core';
import type { ReactNode } from 'react';

interface ScreenTransitionProps {
  isActive: boolean;
  shouldAnimate: boolean;
  children: ReactNode;
}

export const ScreenTransition = ({ isActive, shouldAnimate, children }: ScreenTransitionProps) => (
  <Transition
    mounted={isActive}
    transition="fade"
    duration={shouldAnimate ? 100 : 0}
    timingFunction="ease-out"
    keepMounted={false}
  >
    {(styles) => (
      <div
        style={{
          ...styles,
        }}
        inert={!isActive ? true : undefined}
      >
        {children}
      </div>
    )}
  </Transition>
);
