import icon from '/icon.png';
import { Badge, Button, Card, Center, Group, Image, rem, Stack, Text } from '@mantine/core';
import { useEffect, useState } from 'react';

import { GITHUB_API, PRODUCT_NAME } from '@/constants';
import { useLogoClickSounds } from '@/hooks/useLogoClickSounds';
import type { SystemVersionInfo } from '@/types/electron';

const GitHubIcon = ({ style }: { style?: React.CSSProperties }) => (
  <svg aria-hidden viewBox="0 0 24 24" fill="currentColor" style={style}>
    <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
  </svg>
);

export const AboutTab = () => {
  const [versionInfo, setVersionInfo] = useState<SystemVersionInfo | null>(null);
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
      icon: GitHubIcon,
      label: 'GitHub',
      onClick: () => window.electronAPI.app.openExternal(GITHUB_API.GERBIL_GITHUB_URL),
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
              minHeight: 64,
              minWidth: 64,
              ...getLogoStyles(),
            }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <Group align="center" gap="md" wrap="nowrap">
              <Text size="xl" fw={600}>
                {PRODUCT_NAME}
              </Text>
              <Badge variant="light" color="brand" size="lg" style={{ textTransform: 'none' }}>
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
                  leftSection={<button.icon style={{ height: rem(16), width: rem(16) }} />}
                  onClick={() => void button.onClick()}
                  style={button.label === 'GitHub' ? { textDecoration: 'none' } : undefined}
                >
                  {button.label}
                </Button>
              ))}
            </Group>
          </div>
        </Group>
      </Card>

      <Stack gap="xs">
        <Text size="sm" fw={500} c="dimmed">
          About {PRODUCT_NAME}
        </Text>
        <Text size="sm" c="dimmed">
          {PRODUCT_NAME} is a user-friendly desktop application that makes it easy to run large
          language models locally on your machine. Whether you&apos;re looking to chat with AI
          models, generate images, or explore different interfaces like SillyTavern and Open WebUI,{' '}
          {PRODUCT_NAME} provides a streamlined experience for local AI.
        </Text>
      </Stack>
    </Stack>
  );
};
