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
          position: isActive ? 'static' : 'absolute',
          width: '100%',
          top: 0,
          left: 0,
          zIndex: isActive ? 1 : 0,
        }}
      >
        {children}
      </div>
    )}
  </Transition>
);
