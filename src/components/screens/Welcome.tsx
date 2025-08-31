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
  Anchor,
} from '@mantine/core';
import { Check, ExternalLink } from 'lucide-react';

interface WelcomeScreenProps {
  onGetStarted: () => void;
}

export const WelcomeScreen = ({ onGetStarted }: WelcomeScreenProps) => (
  <Container size="md">
    <Stack gap="xl">
      <Card withBorder radius="md" shadow="sm" p="xl">
        <Stack gap="lg" align="center">
          <Stack gap="md" align="center">
            <Title order={1} ta="center">
              {PRODUCT_NAME}
            </Title>
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
                  - Create artwork and illustrations with AI image models
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
                    No subscription fees
                  </Text>{' '}
                  - Use powerful AI models for free once downloaded
                </Text>
              </List.Item>
              <List.Item>
                <Text>
                  <Text component="span" fw={500}>
                    Hardware acceleration
                  </Text>{' '}
                  - Supports CUDA, ROCm, Vulkan, and CLBlast backends for faster
                  inference
                </Text>
              </List.Item>
            </List>

            <Text size="xs" c="dimmed" ta="center" mt="sm">
              Note: Hardware acceleration requires appropriate drivers to be
              manually installed by the user (CUDA for NVIDIA GPUs, ROCm for AMD
              GPUs, etc.)
            </Text>
          </Stack>

          <Button size="lg" onClick={onGetStarted}>
            Get Started
          </Button>

          <Group gap="lg" mt="md">
            <Anchor
              href="#"
              onClick={(e) => {
                e.preventDefault();
                window.electronAPI.app.openExternal(
                  'https://github.com/LostRuins/koboldcpp'
                );
              }}
              size="sm"
              c="dimmed"
            >
              <Group gap={4} align="center">
                <span>About KoboldCpp</span>
                <ExternalLink size={12} />
              </Group>
            </Anchor>
            <Anchor
              href="#"
              onClick={(e) => {
                e.preventDefault();
                window.electronAPI.app.openExternal(
                  'https://github.com/lone-cloud/gerbil'
                );
              }}
              size="sm"
              c="dimmed"
            >
              <Group gap={4} align="center">
                <span>About Gerbil</span>
                <ExternalLink size={12} />
              </Group>
            </Anchor>
          </Group>
        </Stack>
      </Card>
    </Stack>
  </Container>
);
