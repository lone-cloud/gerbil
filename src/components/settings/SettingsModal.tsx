import { useState, useEffect } from 'react';
import { Modal, Tabs, Text, Group, rem, Button, Box } from '@mantine/core';
import {
  Settings,
  Palette,
  SlidersHorizontal,
  GitBranch,
  Info,
} from 'lucide-react';
import { GeneralTab } from '@/components/settings/GeneralTab';
import { VersionsTab } from '@/components/settings/VersionsTab';
import { AppearanceTab } from '@/components/settings/AppearanceTab';
import { AboutTab } from '@/components/settings/AboutTab';
import type { Screen } from '@/types';
import { MODAL_STYLES_WITH_TITLEBAR } from '@/constants';

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
        ...MODAL_STYLES_WITH_TITLEBAR,
        content: {
          paddingBottom: 0,
        },
        body: {
          height: '70vh',
          padding: 0,
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
        },
      }}
    >
      <Tabs
        value={activeTab}
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
          <Tabs.Tab
            value="about"
            leftSection={<Info style={{ width: rem(16), height: rem(16) }} />}
          >
            About
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="general">
          <GeneralTab isOnInterfaceScreen={isOnInterfaceScreen} />
        </Tabs.Panel>

        {showVersionsTab && (
          <Tabs.Panel value="versions">
            <VersionsTab />
          </Tabs.Panel>
        )}

        <Tabs.Panel value="appearance">
          <AppearanceTab />
        </Tabs.Panel>

        <Tabs.Panel value="about">
          <AboutTab />
        </Tabs.Panel>
      </Tabs>

      <Box
        style={{
          backgroundColor: 'var(--mantine-color-body)',
          padding: '0.5rem 1.5rem 1.5rem',
          display: 'flex',
          justifyContent: 'flex-end',
          flexShrink: 0,
        }}
      >
        <Button onClick={onClose} variant="filled">
          Close
        </Button>
      </Box>
    </Modal>
  );
};
