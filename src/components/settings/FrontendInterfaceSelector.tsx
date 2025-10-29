import { useState, useEffect, useCallback, useMemo } from 'react';
import { Text, Box, Anchor, rem } from '@mantine/core';
import { Monitor, Image } from 'lucide-react';
import { usePreferencesStore } from '@/stores/preferences';
import type {
  FrontendPreference,
  ImageGenerationFrontendPreference,
} from '@/types';
import { FRONTENDS } from '@/constants';
import { Select } from '@/components/Select';

interface FrontendRequirement {
  id: string;
  name: string;
  url: string;
}

interface FrontendConfig {
  value: string;
  label: string;
  badges: string[];
  requirements?: FrontendRequirement[];
  requirementCheck?: () => Promise<boolean>;
}

interface FrontendInterfaceSelectorProps {
  isOnInterfaceScreen?: boolean;
}

export const FrontendInterfaceSelector = ({
  isOnInterfaceScreen = false,
}: FrontendInterfaceSelectorProps) => {
  const {
    frontendPreference,
    setFrontendPreference,
    imageGenerationFrontendPreference,
    setImageGenerationFrontendPreference,
  } = usePreferencesStore();

  const [frontendRequirements, setFrontendRequirements] = useState<
    Map<string, boolean>
  >(new Map());

  const frontendConfigs: FrontendConfig[] = useMemo(
    () => [
      {
        value: 'koboldcpp',
        label: 'Built-in',
        badges: ['Text', 'Image'],
      },
      {
        value: 'sillytavern',
        label: FRONTENDS.SILLYTAVERN,
        badges: ['Text', 'Image'],
        requirements: [
          {
            id: 'nodejs',
            name: 'Node.js',
            url: 'https://nodejs.org/',
          },
        ],
        requirementCheck: () =>
          window.electronAPI.dependencies.isNpxAvailable(),
      },
      {
        value: 'openwebui',
        label: FRONTENDS.OPENWEBUI,
        badges: ['Text', 'Image'],
        requirements: [
          {
            id: 'uv',
            name: 'uv',
            url: 'https://docs.astral.sh/uv/getting-started/installation/',
          },
        ],
        requirementCheck: () => window.electronAPI.dependencies.isUvAvailable(),
      },
      {
        value: 'comfyui',
        label: FRONTENDS.COMFYUI,
        badges: ['Image'],
        requirements: [
          {
            id: 'uv',
            name: 'uv',
            url: 'https://docs.astral.sh/uv/getting-started/installation/',
          },
        ],
        requirementCheck: () => window.electronAPI.dependencies.isUvAvailable(),
      },
    ],
    []
  );

  const checkAllFrontendRequirements = useCallback(async () => {
    const requirementResults = new Map<string, boolean>();

    for (const config of frontendConfigs) {
      if (config.requirementCheck) {
        const isAvailable = await config.requirementCheck();
        requirementResults.set(config.value, isAvailable);
      } else {
        requirementResults.set(config.value, true);
      }
    }

    setFrontendRequirements(requirementResults);

    const currentFrontendConfig = frontendConfigs.find(
      (config) => config.value === frontendPreference
    );
    if (currentFrontendConfig && !requirementResults.get(frontendPreference)) {
      setFrontendPreference('koboldcpp');
    }
  }, [frontendConfigs, frontendPreference, setFrontendPreference]);

  const getSelectedFrontendConfig = () =>
    frontendConfigs.find((config) => config.value === frontendPreference);

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

  const handleFrontendPreferenceChange = (value: string | null) => {
    setFrontendPreference(value as FrontendPreference);
  };

  const handleImageGenerationFrontendChange = (value: string | null) => {
    setImageGenerationFrontendPreference(
      value as ImageGenerationFrontendPreference
    );
  };

  const renderDisabledFrontendWarnings = () => {
    const disabledFrontends = frontendConfigs.filter(
      (config) => !isFrontendAvailable(config.value)
    );

    if (disabledFrontends.length === 0) {
      return null;
    }

    const requirementGroups = new Map<string, string[]>();

    disabledFrontends.forEach((config) => {
      const unmetReqs = getUnmetRequirementsForFrontend(config.value);
      const reqKey = unmetReqs.map((req) => req.id).join(',');
      if (!requirementGroups.has(reqKey)) {
        requirementGroups.set(reqKey, []);
      }
      requirementGroups.get(reqKey)!.push(config.label);
    });

    return (
      <Box mt="sm">
        {Array.from(requirementGroups.entries()).map(
          ([reqKey, frontendLabels]) => {
            const firstDisabledFrontend = disabledFrontends.find(
              (config) =>
                getUnmetRequirementsForFrontend(config.value)
                  .map((req) => req.id)
                  .join(',') === reqKey
            );
            const unmetReqs = firstDisabledFrontend
              ? getUnmetRequirementsForFrontend(firstDisabledFrontend.value)
              : [];

            const frontendText =
              frontendLabels.length === 1
                ? frontendLabels[0]
                : frontendLabels.length === 2
                  ? `${frontendLabels[0]} and ${frontendLabels[1]}`
                  : `${frontendLabels.slice(0, -1).join(', ')}, and ${frontendLabels[frontendLabels.length - 1]}`;

            const isAre = frontendLabels.length === 1 ? 'is' : 'are';

            return (
              <Text key={reqKey} size="sm" c="orange">
                {frontendText} {isAre} disabled - requires{' '}
                {unmetReqs.map((req, index) => (
                  <span key={req.id}>
                    <Anchor
                      href={req.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      td="underline"
                    >
                      {req.name}
                    </Anchor>
                    {index < unmetReqs.length - 1 ? ', ' : ''}
                  </span>
                ))}
              </Text>
            );
          }
        )}
      </Box>
    );
  };

  useEffect(() => {
    const initialize = async () => {
      await checkAllFrontendRequirements();
    };
    initialize();

    const handleFocus = () => {
      checkAllFrontendRequirements();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [checkAllFrontendRequirements]);

  useEffect(() => {
    if (frontendPreference) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      checkAllFrontendRequirements();
    }
  }, [frontendPreference, checkAllFrontendRequirements]);

  return (
    <>
      <Text fw={500} mb="sm">
        Frontend Interface
      </Text>

      {getUnmetRequirements().length === 0 && (
        <Text size="sm" c="dimmed" mb="md">
          Choose which frontend interface to use for interacting with AI models
        </Text>
      )}

      {getUnmetRequirements().length > 0 && (
        <Text size="sm" c="red" mb="md">
          {getSelectedFrontendConfig()?.label} requires{' '}
          {getUnmetRequirements().map((req, index) => (
            <span key={req.id}>
              <Anchor
                href={req.url}
                target="_blank"
                rel="noopener noreferrer"
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
        value={frontendPreference}
        onChange={handleFrontendPreferenceChange}
        disabled={isOnInterfaceScreen}
        data={frontendConfigs.map((config) => ({
          value: config.value,
          label: config.label,
          disabled: !isFrontendAvailable(config.value),
        }))}
        leftSection={<Monitor style={{ width: rem(16), height: rem(16) }} />}
      />

      {renderDisabledFrontendWarnings()}

      <Text fw={500} mb="sm" mt="xl">
        Image Generation Frontend
      </Text>

      <Text size="sm" c="dimmed" mb="md">
        Choose which frontend to use for image generation specifically
      </Text>

      <Select
        value={imageGenerationFrontendPreference}
        onChange={handleImageGenerationFrontendChange}
        disabled={isOnInterfaceScreen}
        data={[
          { value: 'match', label: 'Match Frontend' },
          { value: 'builtin', label: 'Built-in' },
        ]}
        leftSection={<Image style={{ width: rem(16), height: rem(16) }} />}
      />
    </>
  );
};
