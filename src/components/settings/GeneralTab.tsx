import { useState, useEffect, useCallback, useMemo } from 'react';
import { tryExecute, safeExecute } from '@/utils/logger';
import {
  Stack,
  Text,
  Group,
  TextInput,
  Button,
  rem,
  Select,
  Box,
  Anchor,
} from '@mantine/core';
import { Folder, FolderOpen, Monitor } from 'lucide-react';
import styles from '@/styles/layout.module.css';
import type { FrontendPreference } from '@/types';
import { FRONTENDS } from '@/constants';

interface FrontendRequirement {
  id: string;
  name: string;
  url: string;
}

interface FrontendConfig {
  value: string;
  label: string;
  requirements?: FrontendRequirement[];
  requirementCheck?: () => Promise<boolean>;
}

export const GeneralTab = () => {
  const [installDir, setInstallDir] = useState<string>('');
  const [FrontendPreference, setFrontendPreference] =
    useState<FrontendPreference>('koboldcpp');
  const [frontendRequirements, setFrontendRequirements] = useState<
    Map<string, boolean>
  >(new Map());

  const frontendConfigs: FrontendConfig[] = useMemo(
    () => [
      { value: 'koboldcpp', label: 'KoboldCpp (Built-in)' },
      {
        value: 'sillytavern',
        label: FRONTENDS.SILLYTAVERN,
        requirements: [
          {
            id: 'nodejs',
            name: 'Node.js',
            url: 'https://nodejs.org/',
          },
        ],
        requirementCheck: () => window.electronAPI.sillytavern.isNpxAvailable(),
      },
      {
        value: 'openwebui',
        label: FRONTENDS.OPENWEBUI,
        requirements: [
          {
            id: 'uv',
            name: 'uv',
            url: 'https://docs.astral.sh/uv/getting-started/installation/',
          },
        ],
        requirementCheck: () => window.electronAPI.openwebui.isUvAvailable(),
      },
    ],
    []
  );

  const checkAllFrontendRequirements = useCallback(async () => {
    const requirementResults = new Map<string, boolean>();

    for (const config of frontendConfigs) {
      if (config.requirementCheck) {
        const isAvailable = await safeExecute(
          config.requirementCheck,
          `Failed to check requirements for ${config.label}:`
        );
        requirementResults.set(config.value, isAvailable ?? false);
      } else {
        requirementResults.set(config.value, true);
      }
    }

    setFrontendRequirements(requirementResults);

    const currentFrontendConfig = frontendConfigs.find(
      (config) => config.value === FrontendPreference
    );
    if (currentFrontendConfig && !requirementResults.get(FrontendPreference)) {
      await tryExecute(
        () => window.electronAPI.config.set('frontendPreference', 'koboldcpp'),
        'Failed to reset frontend preference:'
      );
      setFrontendPreference('koboldcpp');
    }
  }, [frontendConfigs, FrontendPreference]);

  useEffect(() => {
    const initialize = async () => {
      await Promise.all([
        loadCurrentInstallDir(),
        loadFrontendPreference(),
        checkAllFrontendRequirements(),
      ]);
    };
    initialize();
  }, [checkAllFrontendRequirements]);

  const getSelectedFrontendConfig = () =>
    frontendConfigs.find((config) => config.value === FrontendPreference);

  const getUnmetRequirements = () => {
    const selectedConfig = getSelectedFrontendConfig();
    if (!selectedConfig || !selectedConfig.requirements) return [];

    const isAvailable = frontendRequirements.get(selectedConfig.value) ?? true;
    return isAvailable ? [] : selectedConfig.requirements;
  };

  const getUnmetRequirementsForFrontend = (frontendValue: string) => {
    const config = frontendConfigs.find((c) => c.value === frontendValue);
    if (!config || !config.requirements) return [];

    const isAvailable = frontendRequirements.get(frontendValue) ?? true;
    return isAvailable ? [] : config.requirements;
  };

  const isFrontendAvailable = (frontendValue: string) =>
    frontendRequirements.get(frontendValue) ?? true;

  useEffect(() => {
    if (FrontendPreference) {
      checkAllFrontendRequirements();
    }
  }, [FrontendPreference, checkAllFrontendRequirements]);

  const loadCurrentInstallDir = async () => {
    const currentDir = await safeExecute(
      () => window.electronAPI.kobold.getCurrentInstallDir(),
      'Failed to load install directory:'
    );
    if (currentDir) {
      setInstallDir(currentDir);
    }
  };

  const loadFrontendPreference = async () => {
    const frontendPreference = await safeExecute(
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
    const selectedDir = await safeExecute(
      () => window.electronAPI.kobold.selectInstallDirectory(),
      'Failed to select install directory:'
    );
    if (selectedDir) {
      setInstallDir(selectedDir);
    }
  };

  const handleFrontendPreferenceChange = async (value: string | null) => {
    if (!value || !['koboldcpp', 'sillytavern', 'openwebui'].includes(value))
      return;

    const success = await tryExecute(
      () => window.electronAPI.config.set('frontendPreference', value),
      'Failed to save frontend preference:'
    );
    if (success) {
      setFrontendPreference(value as FrontendPreference);
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

        {getUnmetRequirements().length === 0 && (
          <Text size="sm" c="dimmed" mb="md">
            Choose which frontend interface to use for interacting with AI
            models
          </Text>
        )}

        {getUnmetRequirements().length > 0 && (
          <Text size="sm" c="red" mb="md">
            {getSelectedFrontendConfig()?.label} requires{' '}
            {getUnmetRequirements().map((req, index) => (
              <span key={req.id}>
                <Anchor
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    window.electronAPI.app.openExternal(req.url);
                  }}
                  c="red"
                  td="underline"
                >
                  {req.name}
                </Anchor>
                {index < getUnmetRequirements().length - 1 ? ', ' : ''}
              </span>
            ))}{' '}
            to be installed on your system
          </Text>
        )}

        <Select
          value={FrontendPreference}
          onChange={handleFrontendPreferenceChange}
          data={frontendConfigs.map((config) => ({
            value: config.value,
            label: config.label,
            disabled: !isFrontendAvailable(config.value),
          }))}
          leftSection={<Monitor style={{ width: rem(16), height: rem(16) }} />}
        />

        <Box mt="sm">
          {frontendConfigs
            .filter((config) => !isFrontendAvailable(config.value))
            .map((config) => {
              const unmetReqs = getUnmetRequirementsForFrontend(config.value);
              return (
                <Text key={config.value} size="sm" c="orange" mb="xs">
                  {config.label} is disabled - requires{' '}
                  {unmetReqs.map((req, index) => (
                    <span key={req.id}>
                      <Anchor
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          window.electronAPI.app.openExternal(req.url);
                        }}
                        c="orange"
                        td="underline"
                      >
                        {req.name}
                      </Anchor>
                      {index < unmetReqs.length - 1 ? ', ' : ''}
                    </span>
                  ))}
                </Text>
              );
            })}
        </Box>
      </div>
    </Stack>
  );
};
