import { useState, useEffect } from 'react';
import {
  createSoftwareItems,
  createDriverItems,
  createHardwareItems,
} from '@/utils/systemInfo';
import { Stack, Text, Center } from '@mantine/core';
import { InfoCard } from '@/components/InfoCard';
import type { HardwareInfo } from '@/types/hardware';
import type { SystemVersionInfo } from '@/types/electron';

export const SystemTab = () => {
  const [versionInfo, setVersionInfo] = useState<SystemVersionInfo | null>(
    null
  );
  const [hardwareInfo, setHardwareInfo] = useState<HardwareInfo | null>(null);

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
        <Text c="dimmed">Loading system information...</Text>
      </Center>
    );
  }

  const softwareItems = createSoftwareItems(versionInfo);
  const driverItems = hardwareInfo ? createDriverItems(hardwareInfo) : [];
  const hardwareItems = hardwareInfo ? createHardwareItems(hardwareInfo) : [];

  return (
    <Stack gap="md">
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
