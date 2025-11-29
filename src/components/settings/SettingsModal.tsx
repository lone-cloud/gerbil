import { useState, useEffect } from 'react';
import { Tabs, Text, Group, rem } from '@mantine/core';
import {
  Settings,
  Palette,
  SlidersHorizontal,
  GitBranch,
  Monitor,
  Info,
  Wrench,
} from 'lucide-react';
import { GeneralTab } from '@/components/settings/GeneralTab';
import { BackendsTab } from '@/components/settings/BackendsTab';
import { AppearanceTab } from '@/components/settings/AppearanceTab';
import { SystemTab } from '@/components/settings/SystemTab';
import { TroubleshootingTab } from '@/components/settings/TroubleshootingTab';
import { AboutTab } from '@/components/settings/AboutTab';
import type { Screen } from '@/types';
import { Modal } from '@/components/Modal';

interface SettingsModalProps {
  opened: boolean;
  onClose: () => void;
  currentScreen?: Screen;
  isOnInterfaceScreen?: boolean;
}

export const SettingsModal = ({
  opened,
  onClose,
  currentScreen,
  isOnInterfaceScreen = false,
}: SettingsModalProps) => {
  const [activeTab, setActiveTab] = useState('general');

  const showBackendsTab =
    currentScreen !== 'download' && currentScreen !== 'welcome';

  const effectiveActiveTab =
    !showBackendsTab && activeTab === 'backends' ? 'general' : activeTab;

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
      size="xl"
      showCloseButton
    >
      <div
        style={{
          height: '66vh',
          padding: 0,
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
        }}
      >
        <Tabs
          value={effectiveActiveTab}
          onChange={(value) => value && setActiveTab(value)}
          orientation="vertical"
          variant="pills"
          styles={{
            root: {
              flex: 1,
              minHeight: 0,
            },
            panel: {
              height: '100%',
              overflow: 'auto',
              paddingLeft: '1.5rem',
              paddingRight: '1.5rem',
            },
            tabLabel: {
              textAlign: 'left',
              justifyContent: 'flex-start',
            },
          }}
        >
          <Tabs.List>
            <Tabs.Tab
              value="general"
              leftSection={
                <SlidersHorizontal
                  style={{ width: rem(16), height: rem(16) }}
                />
              }
            >
              General
            </Tabs.Tab>
            {showBackendsTab && (
              <Tabs.Tab
                value="backends"
                leftSection={
                  <GitBranch style={{ width: rem(16), height: rem(16) }} />
                }
              >
                Backends
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
            <Tabs.Tab
              value="system"
              leftSection={
                <Monitor style={{ width: rem(16), height: rem(16) }} />
              }
            >
              System
            </Tabs.Tab>
            <Tabs.Tab
              value="troubleshooting"
              leftSection={
                <Wrench style={{ width: rem(16), height: rem(16) }} />
              }
            >
              Troubleshooting
            </Tabs.Tab>
            <Tabs.Tab
              value="about"
              leftSection={<Info style={{ width: rem(16), height: rem(16) }} />}
            >
              About
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="general">
            <GeneralTab />
          </Tabs.Panel>

          {showBackendsTab && (
            <Tabs.Panel value="backends">
              <BackendsTab />
            </Tabs.Panel>
          )}

          <Tabs.Panel value="appearance">
            <AppearanceTab isOnInterfaceScreen={isOnInterfaceScreen} />
          </Tabs.Panel>

          <Tabs.Panel value="system">
            <SystemTab />
          </Tabs.Panel>

          <Tabs.Panel value="troubleshooting">
            <TroubleshootingTab />
          </Tabs.Panel>

          <Tabs.Panel value="about">
            <AboutTab />
          </Tabs.Panel>
        </Tabs>
      </div>
    </Modal>
  );
};
