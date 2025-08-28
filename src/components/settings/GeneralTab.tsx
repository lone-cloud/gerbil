import { useState, useEffect } from 'react';
import {
  Stack,
  Text,
  Group,
  TextInput,
  Button,
  rem,
  Select,
} from '@mantine/core';
import { Folder, FolderOpen, Monitor } from 'lucide-react';
import styles from '@/styles/layout.module.css';
import type { FrontendPreference } from '@/types';
import { FRONTENDS } from '@/constants';

export const GeneralTab = () => {
  const [installDir, setInstallDir] = useState<string>('');
  const [FrontendPreference, setFrontendPreference] =
    useState<FrontendPreference>('koboldcpp');

  useEffect(() => {
    loadCurrentInstallDir();
    loadFrontendPreference();
  }, []);

  const loadCurrentInstallDir = async () => {
    try {
      const currentDir = await window.electronAPI.kobold.getCurrentInstallDir();
      setInstallDir(currentDir);
    } catch (error) {
      window.electronAPI.logs.logError(
        'Failed to load install directory:',
        error as Error
      );
    }
  };

  const loadFrontendPreference = async () => {
    try {
      const frontendPreference = (await window.electronAPI.config.get(
        'frontendPreference'
      )) as FrontendPreference;
      setFrontendPreference(frontendPreference || 'koboldcpp');
    } catch (error) {
      window.electronAPI.logs.logError(
        'Failed to load frontend preference:',
        error as Error
      );
    }
  };

  const handleSelectInstallDir = async () => {
    try {
      const selectedDir =
        await window.electronAPI.kobold.selectInstallDirectory();

      if (selectedDir) {
        setInstallDir(selectedDir);
      }
    } catch (error) {
      window.electronAPI.logs.logError(
        'Failed to select install directory:',
        error as Error
      );
    }
  };

  const handleFrontendPreferenceChange = async (value: string | null) => {
    if (!value || (value !== 'koboldcpp' && value !== 'sillytavern')) return;

    try {
      await window.electronAPI.config.set('frontendPreference', value);
      setFrontendPreference(value);
    } catch (error) {
      window.electronAPI.logs.logError(
        'Failed to save frontend preference:',
        error as Error
      );
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
        <Text size="sm" c="dimmed" mb="md">
          Choose which frontend interface to use for interacting with models
        </Text>
        <Select
          value={FrontendPreference}
          onChange={handleFrontendPreferenceChange}
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
