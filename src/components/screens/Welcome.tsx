import iconUrl from '/icon.png';
import { Button, Container, Group, Image, List, Stack, Text, Title } from '@mantine/core';

import { PRODUCT_NAME } from '@/constants';

interface WelcomeScreenProps {
  onGetStarted: () => void;
}

export const WelcomeScreen = ({ onGetStarted }: WelcomeScreenProps) => (
  <Container size="md" mt="md">
    <Stack gap="lg" maw={560}>
      <Stack gap="sm">
        <Group gap="md" align="center">
          <Image src={iconUrl} alt={PRODUCT_NAME} w={36} h={36} />
          <Title order={1}>{PRODUCT_NAME}</Title>
        </Group>
        <Text size="lg" c="dimmed">
          Run Large Language Models locally on your hardware.
        </Text>
      </Stack>

      <List spacing="xs" size="sm">
        <List.Item>
          <Text fw={500} component="span">
            Chat
          </Text>{' '}
          — conversations, questions, writing help
        </List.Item>
        <List.Item>
          <Text fw={500} component="span">
            Image generation
          </Text>{' '}
          — artwork and illustrations via LLMs
        </List.Item>
        <List.Item>
          <Text fw={500} component="span">
            Private
          </Text>{' '}
          — everything runs locally, no data leaves the machine
        </List.Item>
        <List.Item>
          <Text fw={500} component="span">
            Accelerated
          </Text>{' '}
          — CUDA, ROCm, and Vulkan backends supported
        </List.Item>
      </List>

      <Text size="xs" c="dimmed">
        Hardware acceleration requires drivers installed separately (CUDA for NVIDIA, ROCm for AMD).
      </Text>

      <Button size="md" onClick={onGetStarted} style={{ alignSelf: 'flex-start' }}>
        Get Started
      </Button>
    </Stack>
  </Container>
);
