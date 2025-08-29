import { useState, useEffect } from 'react';
import {
  Stack,
  Text,
  Group,
  TextInput,
  Button,
  rem,
  Select,
  Anchor,
} from '@mantine/core';
import { Folder, FolderOpen, Monitor } from 'lucide-react';
import styles from '@/styles/layout.module.css';
import type { FrontendPreference } from '@/types';
import { FRONTENDS } from '@/constants';
import { Logger } from '@/utils/logger';

export const GeneralTab = () => {
  const [installDir, setInstallDir] = useState<string>('');
  const [FrontendPreference, setFrontendPreference] =
    useState<FrontendPreference>('koboldcpp');
  const [isNpxAvailable, setIsNpxAvailable] = useState<boolean>(true);

  useEffect(() => {
    const initialize = async () => {
      await Promise.all([loadCurrentInstallDir(), loadFrontendPreference()]);
    };
    initialize();
  }, []);

  useEffect(() => {
    const checkNpxAvailability = async () => {
      const available = await Logger.safeExecute(
        () => window.electronAPI.sillytavern.isNpxAvailable(),
        'Failed to check npx availability:'
      );

      const isAvailable = available ?? false;
      setIsNpxAvailable(isAvailable);

      if (!isAvailable && FrontendPreference === 'sillytavern') {
        await Logger.tryExecute(
          () =>
            window.electronAPI.config.set('frontendPreference', 'koboldcpp'),
          'Failed to reset frontend preference:'
        );
        setFrontendPreference('koboldcpp');
      }
    };

    if (FrontendPreference) {
      checkNpxAvailability();
    }
  }, [FrontendPreference]);

  const loadCurrentInstallDir = async () => {
    const currentDir = await Logger.safeExecute(
      () => window.electronAPI.kobold.getCurrentInstallDir(),
      'Failed to load install directory:'
    );
    if (currentDir) {
      setInstallDir(currentDir);
    }
  };

  const loadFrontendPreference = async () => {
    const frontendPreference = await Logger.safeExecute(
      () => window.electronAPI.config.get('frontendPreference'),
      'Failed to load frontend preference:'
    );
    if (frontendPreference) {
      setFrontendPreference(
        (frontendPreference as FrontendPreference) || 'koboldcpp'
      );
    }
  };

  const handleSelectInstallDir = async () => {
    const selectedDir = await Logger.safeExecute(
      () => window.electronAPI.kobold.selectInstallDirectory(),
      'Failed to select install directory:'
    );
    if (selectedDir) {
      setInstallDir(selectedDir);
    }
  };

  const handleFrontendPreferenceChange = async (value: string | null) => {
    if (!value || (value !== 'koboldcpp' && value !== 'sillytavern')) return;

    const success = await Logger.tryExecute(
      () => window.electronAPI.config.set('frontendPreference', value),
      'Failed to save frontend preference:'
    );
    if (success) {
      setFrontendPreference(value);
    }
  };

  return (
    <Stack gap="lg" h="100%">
      <div>
        <Text fw={500} mb="sm">
          Installation Directory
        </Text>
        <Text size="sm" c="dimmed" mb="md">
          Choose where application files will be downloaded and stored
        </Text>
        <Group gap="xs">
          <TextInput
            value={installDir}
            readOnly
            placeholder="Default installation directory"
            className={styles.flex1}
            leftSection={<Folder style={{ width: rem(16), height: rem(16) }} />}
          />
          <Button
            variant="outline"
            onClick={handleSelectInstallDir}
            leftSection={
              <FolderOpen style={{ width: rem(16), height: rem(16) }} />
            }
          >
            Browse
          </Button>
        </Group>
      </div>

      <div>
        <Text fw={500} mb="sm">
          Frontend Interface
        </Text>
        {isNpxAvailable && (
          <Text size="sm" c="dimmed" mb="md">
            Choose which frontend interface to use for interacting with models
          </Text>
        )}

        {!isNpxAvailable && (
          <Text size="sm" c="red" mb="md">
            Custom frontends require{' '}
            <Anchor
              href="#"
              onClick={(e) => {
                e.preventDefault();
                window.electronAPI.app.openExternal('https://nodejs.org/');
              }}
              c="red"
              td="underline"
            >
              Node.js
            </Anchor>{' '}
            to be installed on your system
          </Text>
        )}
        <Select
          value={FrontendPreference}
          onChange={handleFrontendPreferenceChange}
          disabled={!isNpxAvailable}
          data={[
            { value: 'koboldcpp', label: 'KoboldCpp (Built-in)' },
            {
              value: 'sillytavern',
              label: FRONTENDS.SILLYTAVERN,
            },
          ]}
          leftSection={<Monitor style={{ width: rem(16), height: rem(16) }} />}
        />
      </div>
    </Stack>
  );
};
