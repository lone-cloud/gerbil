import { useState, useEffect } from 'react';
import { Modal, Tabs, Text, Group, rem } from '@mantine/core';
import { Settings, Palette, SlidersHorizontal, GitBranch } from 'lucide-react';
import { GeneralTab } from '@/components/settings/GeneralTab';
import { VersionsTab } from '@/components/settings/VersionsTab';
import { AppearanceTab } from '@/components/settings/AppearanceTab';
import type { Screen } from '@/types';

interface SettingsModalProps {
  opened: boolean;
  onClose: () => void;
  currentScreen?: Screen;
}

export const SettingsModal = ({
  opened,
  onClose,
  currentScreen,
}: SettingsModalProps) => {
  const [activeTab, setActiveTab] = useState('general');

  const showVersionsTab =
    currentScreen !== 'download' && currentScreen !== 'welcome';

  useEffect(() => {
    if (!showVersionsTab && activeTab === 'versions') {
      setActiveTab('general');
    }
  }, [showVersionsTab, activeTab]);

  useEffect(() => {
    if (opened) {
      setActiveTab('general');

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
      size="xl"
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
          {showVersionsTab && (
            <Tabs.Tab
              value="versions"
              leftSection={
                <GitBranch style={{ width: rem(16), height: rem(16) }} />
              }
            >
              Versions
            </Tabs.Tab>
          )}
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

        {showVersionsTab && (
          <Tabs.Panel value="versions" style={{ overflow: 'visible' }}>
            <VersionsTab />
          </Tabs.Panel>
        )}

        <Tabs.Panel value="appearance">
          <AppearanceTab />
        </Tabs.Panel>
      </Tabs>
    </Modal>
  );
};
