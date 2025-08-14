import { useState, useEffect } from 'react';
import { Modal, Tabs, Text, Group, rem } from '@mantine/core';
import { Settings, Palette, SlidersHorizontal, GitBranch } from 'lucide-react';
import { GeneralTab } from './settings/GeneralTab';
import { VersionsTab } from './settings/VersionsTab';
import { AppearanceTab } from './settings/AppearanceTab';

interface SettingsModalProps {
  opened: boolean;
  onClose: () => void;
}

export const SettingsModal = ({ opened, onClose }: SettingsModalProps) => {
  const [activeTab, setActiveTab] = useState('general');

  useEffect(() => {
    if (opened) {
      const originalOverflow = document.body.style.overflow;
      const scrollbarWidth =
        window.innerWidth - document.documentElement.clientWidth;

      document.body.style.overflow = 'hidden';
      document.body.style.paddingRight = `${scrollbarWidth}px`;

      return () => {
        document.body.style.overflow = originalOverflow;
        document.body.style.paddingRight = '';
      };
    }
  }, [opened]);

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap="xs">
          <Settings size={20} />
          <Text fw={500}>Settings</Text>
        </Group>
      }
      size="lg"
      centered
      lockScroll={false}
      styles={{
        body: {
          height: '400px',
          padding: 0,
        },
        content: {
          height: '500px',
        },
      }}
      transitionProps={{
        duration: 200,
      }}
    >
      <Tabs
        value={activeTab}
        onChange={(value) => value && setActiveTab(value)}
        orientation="vertical"
        variant="pills"
        styles={{
          root: {
            height: '100%',
          },
          panel: {
            height: '100%',
            overflow: 'auto',
            paddingLeft: '24px',
            paddingRight: '24px',
          },
        }}
      >
        <Tabs.List>
          <Tabs.Tab
            value="general"
            leftSection={
              <SlidersHorizontal style={{ width: rem(16), height: rem(16) }} />
            }
          >
            General
          </Tabs.Tab>
          <Tabs.Tab
            value="versions"
            leftSection={
              <GitBranch style={{ width: rem(16), height: rem(16) }} />
            }
          >
            Versions
          </Tabs.Tab>
          <Tabs.Tab
            value="appearance"
            leftSection={
              <Palette style={{ width: rem(16), height: rem(16) }} />
            }
          >
            Appearance
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="general">
          <GeneralTab />
        </Tabs.Panel>

        <Tabs.Panel value="versions">
          <VersionsTab />
        </Tabs.Panel>

        <Tabs.Panel value="appearance">
          <AppearanceTab />
        </Tabs.Panel>
      </Tabs>
    </Modal>
  );
};
