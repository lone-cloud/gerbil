import iconUrl from '/icon.png';
import { Badge, Box, Button, Group, Stack, Text, Title } from '@mantine/core';

import { PRODUCT_NAME } from '@/constants';

interface WelcomeScreenProps {
  onGetStarted: () => void;
}

const FEATURES = ['Chat & roleplay', 'Image generation', '100% local', 'CUDA · ROCm · Vulkan'];

export const WelcomeScreen = ({ onGetStarted }: WelcomeScreenProps) => (
  <Box
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 'calc(100svh - 6rem)',
    }}
  >
    <Stack gap={40} align="center" maw={480} style={{ width: '100%', textAlign: 'center' }}>
      <Stack gap="lg" align="center">
        <img src={iconUrl} alt={PRODUCT_NAME} width={64} height={64} />
        <Stack gap="xs" align="center">
          <Title order={1}>{PRODUCT_NAME}</Title>
          <Text size="lg" fw={500}>
            Local LLMs, fully under your control.
          </Text>
        </Stack>
      </Stack>

      <Group gap="xs" justify="center" wrap="wrap">
        {FEATURES.map((feature) => (
          <Badge key={feature} size="lg" variant="light" color="brand" radius="sm">
            {feature}
          </Badge>
        ))}
      </Group>

      <Stack gap="xs" align="center">
        <Button size="lg" onClick={onGetStarted} px="xl">
          Get Started
        </Button>
        <Text size="xs" c="dimmed">
          GPU acceleration requires CUDA, ROCm or Vulkan drivers.
        </Text>
      </Stack>
    </Stack>
  </Box>
);
