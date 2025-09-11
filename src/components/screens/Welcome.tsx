import { PRODUCT_NAME } from '@/constants';
import {
  Container,
  Card,
  Stack,
  Title,
  Text,
  Button,
  Group,
  List,
  ThemeIcon,
  Image,
} from '@mantine/core';
import { Check } from 'lucide-react';
import iconUrl from '/icon.png';

interface WelcomeScreenProps {
  onGetStarted: () => void;
}

export const WelcomeScreen = ({ onGetStarted }: WelcomeScreenProps) => (
  <Container size="md" mt="md">
    <Stack gap="xl">
      <Card withBorder radius="md" shadow="sm" p="xl">
        <Stack gap="lg" align="center">
          <Stack gap="md" align="center">
            <Group gap="md" mr="xl" align="center">
              <Image src={iconUrl} alt={PRODUCT_NAME} w={36} h={36} />
              <Title order={1} ta="center">
                {PRODUCT_NAME}
              </Title>
            </Group>
            <Text size="lg" c="dimmed" ta="center" maw={600}>
              Run Large Language Models locally
            </Text>
          </Stack>

          <Stack gap="lg" w="100%" maw={600}>
            <List
              spacing="sm"
              size="sm"
              center
              icon={
                <ThemeIcon color="green" size={20} radius="xl">
                  <Check size={12} />
                </ThemeIcon>
              }
            >
              <List.Item>
                <Text>
                  <Text component="span" fw={500}>
                    Chat with AI models
                  </Text>{' '}
                  - Have conversations, ask questions, get help with writing
                </Text>
              </List.Item>
              <List.Item>
                <Text>
                  <Text component="span" fw={500}>
                    Generate images
                  </Text>{' '}
                  - Easily create artwork and illustrations with LLMs
                </Text>
              </List.Item>
              <List.Item>
                <Text>
                  <Text component="span" fw={500}>
                    Complete privacy
                  </Text>{' '}
                  - Everything runs on your computer, no data sent to servers
                </Text>
              </List.Item>
              <List.Item>
                <Text>
                  <Text component="span" fw={500}>
                    Hardware acceleration
                  </Text>{' '}
                  - Supports CUDA, ROCm, Vulkan and CLBlast backends
                </Text>
              </List.Item>
            </List>

            <Text size="xs" c="dimmed" ta="center" mt="sm">
              Hardware acceleration requires appropriate drivers to be manually
              installed (CUDA for NVIDIA GPUs, ROCm for AMD GPUs, etc.)
            </Text>
          </Stack>

          <Button size="lg" mt="lg" onClick={onGetStarted}>
            Get Started
          </Button>
        </Stack>
      </Card>
    </Stack>
  </Container>
);
