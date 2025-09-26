import { useState, useEffect } from 'react';
import {
  createSoftwareItems,
  createDriverItems,
  createHardwareItems,
  type HardwareInfo,
} from '@/utils/systemInfo';
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
import { Github, FolderOpen, FileText } from 'lucide-react';
import { useLogoClickSounds } from '@/hooks/useLogoClickSounds';
import type { SystemVersionInfo } from '@/types/electron';
import { PRODUCT_NAME, GITHUB_API } from '@/constants';
import { InfoCard } from '@/components/InfoCard';

import icon from '/icon.png';

export const AboutTab = () => {
  const [versionInfo, setVersionInfo] = useState<SystemVersionInfo | null>(
    null
  );
  const [hardwareInfo, setHardwareInfo] = useState<HardwareInfo | null>(null);
  const { handleLogoClick, getLogoStyles } = useLogoClickSounds();

  useEffect(() => {
    const loadVersionInfo = async () => {
      const info = await window.electronAPI.app.getVersionInfo();
      if (info) {
        setVersionInfo(info);
      }
    };

    const loadHardwareInfo = async () => {
      try {
        const [cpu, gpu, gpuCapabilities, gpuMemory, systemMemory] =
          await Promise.all([
            window.electronAPI.kobold.detectCPU(),
            window.electronAPI.kobold.detectGPU(),
            window.electronAPI.kobold.detectGPUCapabilities(),
            window.electronAPI.kobold.detectGPUMemory(),
            window.electronAPI.kobold.detectSystemMemory(),
          ]);

        setHardwareInfo({
          cpu,
          gpu,
          gpuCapabilities,
          gpuMemory,
          systemMemory,
        });
      } catch (error) {
        window.electronAPI.logs.logError(
          'Failed to load hardware info',
          error as Error
        );
      }
    };

    loadVersionInfo();
    loadHardwareInfo();
  }, []);

  if (!versionInfo) {
    return (
      <Center h="100%">
        <Text c="dimmed">Loading version information...</Text>
      </Center>
    );
  }

  const softwareItems = createSoftwareItems(versionInfo);
  const driverItems = hardwareInfo ? createDriverItems(hardwareInfo) : [];
  const hardwareItems = hardwareInfo ? createHardwareItems(hardwareInfo) : [];

  const actionButtons = [
    {
      icon: Github,
      label: 'GitHub',
      onClick: () =>
        window.electronAPI.app.openExternal(GITHUB_API.GERBIL_GITHUB_URL),
    },
    {
      icon: FolderOpen,
      label: 'Show Logs',
      onClick: () => window.electronAPI.app.showLogsFolder(),
    },
    {
      icon: FileText,
      label: 'View Config',
      onClick: () => window.electronAPI.app.viewConfigFile(),
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
              {actionButtons.map((button) => (
                <Button
                  key={button.label}
                  variant="light"
                  size="compact-sm"
                  leftSection={
                    <button.icon style={{ width: rem(16), height: rem(16) }} />
                  }
                  onClick={button.onClick}
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

      <InfoCard title="Software" items={softwareItems} />

      <InfoCard title="Drivers" items={driverItems} loading={!hardwareInfo} />

      <InfoCard
        title="Hardware"
        items={hardwareItems}
        loading={!hardwareInfo}
      />
    </Stack>
  );
};
