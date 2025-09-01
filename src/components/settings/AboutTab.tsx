import { useState, useEffect } from 'react';
import {
  Text,
  Stack,
  Anchor,
  Group,
  Card,
  Image,
  Center,
  Badge,
  Button,
  rem,
} from '@mantine/core';
import { Github, FolderOpen } from 'lucide-react';
import { safeExecute } from '@/utils/logger';
import type { VersionInfo } from '@/types/electron';
import { PRODUCT_NAME } from '@/constants';
import iconUrl from '/icon.png';
export const AboutTab = () => {
  const [versionInfo, setVersionInfo] = useState<VersionInfo | null>(null);
  useEffect(() => {
    const loadVersionInfo = async () => {
      const info = await safeExecute(
        () => window.electronAPI.app.getVersionInfo(),
        'Failed to load version info'
      );
      if (info) {
        setVersionInfo(info);
      }
    };
    loadVersionInfo();
  }, []);
  if (!versionInfo) {
    return (
      <Center h="100%">
        <Text c="dimmed">Loading version information...</Text>
      </Center>
    );
  }

  const versionItems = [
    { label: 'App Version', value: versionInfo.appVersion },
    { label: 'Electron', value: versionInfo.electronVersion },
    { label: 'Node.js', value: versionInfo.nodeVersion },
    { label: 'Chromium', value: versionInfo.chromeVersion },
    { label: 'V8', value: versionInfo.v8Version },
    {
      label: 'Operating System',
      value: `${versionInfo.platform} ${versionInfo.arch} (${versionInfo.osVersion})`,
    },
  ];

  return (
    <Stack gap="md">
      <Card withBorder radius="md" p="xs">
        <Group align="center" gap="lg" wrap="nowrap">
          <Image
            src={iconUrl}
            alt={PRODUCT_NAME}
            w={64}
            h={64}
            style={{ minWidth: 64, minHeight: 64 }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <Group align="center" gap="md" wrap="nowrap">
              <Text size="xl" fw={700}>
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
              <Anchor
                href="https://github.com/lone-cloud/gerbil"
                target="_blank"
                onClick={(e) => {
                  e.preventDefault();
                  window.electronAPI.app.openExternal(
                    'https://github.com/lone-cloud/gerbil'
                  );
                }}
                style={{ textDecoration: 'none' }}
              >
                <Group gap="xs" align="center">
                  <Github style={{ width: rem(16), height: rem(16) }} />
                  <Text size="sm" fw={500}>
                    GitHub
                  </Text>
                </Group>
              </Anchor>

              <Button
                variant="light"
                size="compact-sm"
                leftSection={
                  <FolderOpen style={{ width: rem(16), height: rem(16) }} />
                }
                onClick={async () => {
                  await safeExecute(
                    () => window.electronAPI.app.showLogsFolder(),
                    'Failed to open logs folder'
                  );
                }}
              >
                Show Logs
              </Button>
            </Group>
          </div>
        </Group>
      </Card>

      <Card withBorder radius="md" p="xs">
        <Stack gap="xs">
          {versionItems.map((item, index) => (
            <Group key={index} gap="md" align="center" wrap="nowrap">
              <Text
                size="sm"
                fw={500}
                c="dimmed"
                style={{ minWidth: '7.5rem' }}
              >
                {item.label}:
              </Text>
              <Text
                size="sm"
                ff="monospace"
                style={{
                  wordBreak: 'break-all',
                  flex: 1,
                }}
              >
                {item.value}
              </Text>
            </Group>
          ))}
        </Stack>
      </Card>
    </Stack>
  );
};
