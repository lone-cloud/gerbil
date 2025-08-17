import { Center, Stack, Text, Loader, Overlay } from '@mantine/core';

interface InitializationOverlayProps {
  visible: boolean;
  step: string;
}

export const InitializationOverlay = ({
  visible,
  step,
}: InitializationOverlayProps) => {
  if (!visible) return null;

  return (
    <Overlay
      color="var(--mantine-color-body)"
      backgroundOpacity={0.85}
      blur={2}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 10,
      }}
    >
      <Center h="100%">
        <Stack align="center" gap="md">
          <Loader size="lg" color="blue" />
          <Text size="lg" fw={500} ta="center">
            Initializing Hardware Detection
          </Text>
          <Text size="sm" c="dimmed" ta="center">
            {step}
          </Text>
        </Stack>
      </Center>
    </Overlay>
  );
};
