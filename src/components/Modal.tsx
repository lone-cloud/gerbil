import { Box, Button, Modal as MantineModal } from '@mantine/core';
import type { ReactNode } from 'react';

const TITLEBAR_HEIGHT = '2.5rem';

const MODAL_STYLES_WITH_TITLEBAR = {
  content: {
    marginTop: TITLEBAR_HEIGHT,
  },
  overlay: {
    top: TITLEBAR_HEIGHT,
  },
} as const;

export interface ModalProps {
  opened: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  size?: string | number;
  closeOnClickOutside?: boolean;
  closeOnEscape?: boolean;
  showCloseButton?: boolean;
  tallContent?: boolean;
}

export const Modal = ({
  opened,
  onClose,
  title,
  children,
  size,
  closeOnClickOutside = true,
  closeOnEscape = true,
  showCloseButton = false,
  tallContent = false,
  ...props
}: ModalProps) => {
  const content = tallContent ? (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '75vh',
        padding: 0,
        position: 'relative',
      }}
    >
      {children}
    </div>
  ) : (
    <>
      {children}
      {showCloseButton && (
        <Box
          style={{
            display: 'flex',
            flexShrink: 0,
            justifyContent: 'flex-end',
            padding: '1rem 0',
          }}
        >
          <Button onClick={onClose} variant="filled">
            Close
          </Button>
        </Box>
      )}
    </>
  );

  return (
    <MantineModal
      opened={opened}
      onClose={onClose}
      title={title}
      size={size}
      centered
      closeOnClickOutside={closeOnClickOutside}
      closeOnEscape={closeOnEscape}
      styles={MODAL_STYLES_WITH_TITLEBAR}
      {...props}
    >
      {content}
    </MantineModal>
  );
};
