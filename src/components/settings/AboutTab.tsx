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
  ActionIcon,
  Tooltip,
} from '@mantine/core';
import { Github, FolderOpen, Copy } from 'lucide-react';
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
    { label: PRODUCT_NAME, value: versionInfo.appVersion },
    { label: 'Electron', value: versionInfo.electronVersion },
    { label: 'Node.js', value: versionInfo.nodeVersion },
    { label: 'Chromium', value: versionInfo.chromeVersion },
    { label: 'V8', value: versionInfo.v8Version },
    {
      label: 'Operating System',
      value: `${versionInfo.platform} ${versionInfo.arch} (${versionInfo.osVersion})`,
    },
  ];

  const copyVersionInfo = async () => {
    const info = [
      `${PRODUCT_NAME}: ${versionInfo.appVersion}`,
      `Electron: ${versionInfo.electronVersion}`,
      `Node.js: ${versionInfo.nodeVersion}`,
      `Chromium: ${versionInfo.chromeVersion}`,
      `V8: ${versionInfo.v8Version}`,
      `OS: ${versionInfo.platform} ${versionInfo.arch} (${versionInfo.osVersion})`,
    ].join('\n');

    await safeExecute(
      () => navigator.clipboard.writeText(info),
      'Failed to copy version info'
    );
  };

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
                rel="noopener noreferrer"
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

      <Card withBorder radius="md" p="xs" style={{ position: 'relative' }}>
        <Tooltip label="Copy Version Info">
          <ActionIcon
            variant="subtle"
            size="sm"
            onClick={copyVersionInfo}
            aria-label="Copy Version Info"
            style={{
              position: 'absolute',
              top: 8,
              right: 8,
              zIndex: 1,
            }}
          >
            <Copy style={{ width: rem(14), height: rem(14) }} />
          </ActionIcon>
        </Tooltip>
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
