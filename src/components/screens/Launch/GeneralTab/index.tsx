import { Group, Slider, Stack, Text, TextInput, Tooltip, Transition } from '@mantine/core';
import { useEffect, useState } from 'react';
import { InfoTooltip } from '@/components/InfoTooltip';
import { AccelerationSelector } from '@/components/screens/Launch/GeneralTab/AccelerationSelector';
import { ModelFileField } from '@/components/screens/Launch/ModelFileField';
import { useLaunchConfigStore } from '@/stores/launchConfig';

interface GeneralTabProps {
  configLoaded?: boolean;
}

export const GeneralTab = ({ configLoaded = true }: GeneralTabProps) => {
  const { model, contextSize, setModel, selectFile, setContextSizeWithStep } =
    useLaunchConfigStore();
  const [isSliding, setIsSliding] = useState(false);

  useEffect(() => {
    if (!isSliding) {
      return;
    }

    const handlePointerUp = () => setIsSliding(false);

    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);

    return () => {
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [isSliding]);

  return (
    <Transition mounted={configLoaded} transition="fade" duration={100} timingFunction="ease-out">
      {(styles) => (
        <Stack gap="md" style={styles}>
          <AccelerationSelector />

          <ModelFileField
            label="Text Model File"
            value={model}
            placeholder="Select a .gguf model file or enter a direct URL to file"
            tooltip="Select a GGUF text generation model file for chat and completion tasks."
            onChange={setModel}
            onSelectFile={() => void selectFile('model', 'Select Text Model')}
            searchParams={{
              pipelineTag: 'text-generation',
              filter: 'gguf',
              sort: 'trendingScore',
            }}
            showAnalyze
            paramType="model"
          />

          <div>
            <Group justify="space-between" align="center" mb="xs">
              <Group gap="xs" align="center">
                <Text size="sm" fw={500}>
                  Context Size
                </Text>
                <InfoTooltip label="Controls the memory allocated for maximum context size. The larger the context, the larger the required memory." />
              </Group>
              <TextInput
                value={contextSize?.toString() || ''}
                onChange={(event) => setContextSizeWithStep(Number(event.target.value) || 256)}
                type="number"
                min={256}
                max={262144}
                step={256}
                size="sm"
                w={100}
              />
            </Group>
            <div onPointerDown={() => setIsSliding(true)}>
              <Slider
                value={contextSize}
                min={256}
                max={262144}
                step={256}
                onChange={setContextSizeWithStep}
                label={null}
                thumbChildren={
                  <Tooltip
                    label={contextSize.toLocaleString()}
                    position="top"
                    withArrow
                    withinPortal
                    opened={isSliding ? true : undefined}
                  >
                    <span style={{ display: 'block', width: '100%', height: '100%' }} />
                  </Tooltip>
                }
              />
            </div>
          </div>
        </Stack>
      )}
    </Transition>
  );
};
