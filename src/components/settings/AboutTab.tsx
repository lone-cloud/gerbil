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
  ActionIcon,
  Tooltip,
} from '@mantine/core';
import { Github, FolderOpen, Copy } from 'lucide-react';
import { safeExecute } from '@/utils/logger';
import { useLogoClickSounds } from '@/hooks/useLogoClickSounds';
import type { VersionInfo } from '@/types/electron';
import { PRODUCT_NAME } from '@/constants';
import icon from '/icon.png';

export const AboutTab = () => {
  const [versionInfo, setVersionInfo] = useState<VersionInfo | null>(null);
  const { handleLogoClick, getLogoStyles } = useLogoClickSounds();
  useEffect(() => {
    const loadVersionInfo = async () => {
      const info = await window.electronAPI.app.getVersionInfo();
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
    {
      label: 'Node.js',
      value: versionInfo.nodeJsSystemVersion
        ? `${versionInfo.nodeVersion} (System: ${versionInfo.nodeJsSystemVersion})`
        : versionInfo.nodeVersion,
    },
    { label: 'Chromium', value: versionInfo.chromeVersion },
    { label: 'V8', value: versionInfo.v8Version },
    {
      label: 'OS',
      value: `${versionInfo.platform} ${versionInfo.arch} (${versionInfo.osVersion})`,
    },
    ...(versionInfo.uvVersion
      ? [{ label: 'uv', value: versionInfo.uvVersion }]
      : []),
  ];

  const copyVersionInfo = async () => {
    const info = versionItems
      .map((item) => `${item.label}: ${item.value}`)
      .join('\n');

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
            src={icon}
            alt={PRODUCT_NAME}
            w={64}
            h={64}
            onClick={handleLogoClick}
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
              <Button
                variant="subtle"
                size="compact-sm"
                leftSection={
                  <Github style={{ width: rem(16), height: rem(16) }} />
                }
                onClick={() =>
                  window.electronAPI.app.openExternal(
                    'https://github.com/lone-cloud/gerbil'
                  )
                }
                style={{ textDecoration: 'none' }}
              >
                GitHub
              </Button>

              <Button
                variant="light"
                size="compact-sm"
                leftSection={
                  <FolderOpen style={{ width: rem(16), height: rem(16) }} />
                }
                onClick={() => window.electronAPI.app.showLogsFolder()}
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
