import { Modal as MantineModal, Button, Box } from '@mantine/core';
import { ReactNode } from 'react';

const TITLEBAR_HEIGHT = '2.5rem';

const MODAL_STYLES_WITH_TITLEBAR = {
  overlay: {
    top: TITLEBAR_HEIGHT,
  },
  content: {
    marginTop: TITLEBAR_HEIGHT,
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
}

export const Modal = ({
  opened,
  onClose,
  title,
  children,
  size,
  closeOnClickOutside = false,
  closeOnEscape = true,
  showCloseButton = false,
  ...props
}: ModalProps) => (
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
    {children}
    {showCloseButton && (
      <Box
        style={{
          padding: '1rem 0',
          display: 'flex',
          justifyContent: 'flex-end',
          flexShrink: 0,
        }}
      >
        <Button onClick={onClose} variant="filled">
          Close
        </Button>
      </Box>
    )}
  </MantineModal>
);
