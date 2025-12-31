import { useState, useEffect } from 'react';
import {
  Text,
  Stack,
  Group,
  Card,
  Image,
  Center,
  Badge,
  Button,
  rem,
} from '@mantine/core';
import { Github } from 'lucide-react';
import { useLogoClickSounds } from '@/hooks/useLogoClickSounds';
import { PRODUCT_NAME, GITHUB_API } from '@/constants';
import type { SystemVersionInfo } from '@/types/electron';

import icon from '/icon.png';

export const AboutTab = () => {
  const [versionInfo, setVersionInfo] = useState<SystemVersionInfo | null>(
    null
  );
  const { handleLogoClick, getLogoStyles } = useLogoClickSounds();

  useEffect(() => {
    const loadVersionInfo = async () => {
      const info = await window.electronAPI.app.getVersionInfo();
      if (info) {
        setVersionInfo(info);
      }
    };

    void loadVersionInfo();
  }, []);

  if (!versionInfo) {
    return (
      <Center h="100%">
        <Text c="dimmed">Loading version information...</Text>
      </Center>
    );
  }

  const actionButtons = [
    {
      icon: Github,
      label: 'GitHub',
      onClick: () =>
        window.electronAPI.app.openExternal(GITHUB_API.GERBIL_GITHUB_URL),
    },
  ];

  return (
    <Stack gap="md">
      <Card withBorder radius="md" p="xs">
        <Group align="center" gap="lg" wrap="nowrap">
          <Image
            src={icon}
            alt={PRODUCT_NAME}
            w={64}
            h={64}
            onClick={() => void handleLogoClick()}
            style={{
              minWidth: 64,
              minHeight: 64,
              ...getLogoStyles(),
            }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <Group align="center" gap="md" wrap="nowrap">
              <Text size="xl" fw={600}>
                {PRODUCT_NAME}
              </Text>
              <Badge
                variant="light"
                color="blue"
                size="lg"
                style={{ textTransform: 'none' }}
              >
                v{versionInfo.appVersion}
              </Badge>
            </Group>
            <Text size="sm" c="dimmed" mt="xs">
              Run Large Language Models locally
            </Text>
            <Group gap="md" mt="md">
              {actionButtons.map((button) => (
                <Button
                  key={button.label}
                  variant="light"
                  size="compact-sm"
                  leftSection={
                    <button.icon style={{ width: rem(16), height: rem(16) }} />
                  }
                  onClick={() => void button.onClick()}
                  style={
                    button.label === 'GitHub'
                      ? { textDecoration: 'none' }
                      : undefined
                  }
                >
                  {button.label}
                </Button>
              ))}
            </Group>
          </div>
        </Group>
      </Card>

      <Card withBorder radius="md" p="md">
        <Text size="lg" fw={500} mb="md">
          About {PRODUCT_NAME}
        </Text>
        <Text size="sm" c="dimmed" mb="md">
          {PRODUCT_NAME} is a user-friendly desktop application that makes it
          easy to run large language models locally on your machine. Whether
          you&apos;re looking to chat with AI models, generate images, or
          explore different interfaces like SillyTavern and Open WebUI,{' '}
          {PRODUCT_NAME} provides a streamlined experience for local AI.
        </Text>
      </Card>
    </Stack>
  );
};
