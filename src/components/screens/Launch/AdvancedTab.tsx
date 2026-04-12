import { ActionIcon, Button, Group, SimpleGrid, Stack, Text, TextInput } from '@mantine/core';
import { Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';

import { CheckboxWithTooltip } from '@/components/CheckboxWithTooltip';
import { InfoTooltip } from '@/components/InfoTooltip';
import { CommandLineArgumentsModal } from '@/components/screens/Launch/CommandLineArgumentsModal';
import { useLaunchConfigStore } from '@/stores/launchConfig';

export const AdvancedTab = () => {
  const {
    additionalArguments,
    preLaunchCommands,
    noavx2,
    failsafe,
    debugmode,
    jinja,
    jinjatools,
    jinjakwargs,
    setAdditionalArguments,
    setPreLaunchCommands,
    setNoavx2,
    setFailsafe,
    setDebugmode,
    setJinja,
    setJinjatools,
    setJinjakwargs,
  } = useLaunchConfigStore();
  const [commandLineModalOpen, setCommandLineModalOpen] = useState(false);
  const [backendSupport, setBackendSupport] = useState<{
    noavx2: boolean;
    failsafe: boolean;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const handleAddArgument = (newArgument: string) => {
    const currentArgs = additionalArguments.trim();
    const updatedArgs = currentArgs ? `${currentArgs} ${newArgument}` : newArgument;
    setAdditionalArguments(updatedArgs);
  };

  useEffect(() => {
    const detectAccelerationSupport = async () => {
      const support = await window.electronAPI.kobold.detectAccelerationSupport();

      if (support) {
        setBackendSupport({
          failsafe: support.failsafe,
          noavx2: support.noavx2,
        });
      } else {
        setBackendSupport({ failsafe: false, noavx2: false });
      }

      setIsLoading(false);
    };

    void detectAccelerationSupport();
  }, []);

  return (
    <Stack gap="md">
      <div>
        <SimpleGrid cols={3} spacing="lg" verticalSpacing="md">
          <CheckboxWithTooltip
            checked={noavx2}
            onChange={setNoavx2}
            label="Disable AVX2"
            tooltip={
              !backendSupport?.noavx2 && !isLoading
                ? 'This binary does not support the no-AVX2 mode.'
                : 'Do not use AVX2 instructions, a slower compatibility mode for older devices.'
            }
            disabled={isLoading || !backendSupport?.noavx2}
          />

          <CheckboxWithTooltip
            checked={failsafe}
            onChange={setFailsafe}
            label="Failsafe"
            tooltip={
              !backendSupport?.failsafe && !isLoading
                ? 'This binary does not support failsafe mode.'
                : 'Use failsafe mode, extremely slow CPU only compatibility mode that should work on all devices.'
            }
            disabled={isLoading || !backendSupport?.failsafe}
          />

          <CheckboxWithTooltip
            checked={debugmode}
            onChange={setDebugmode}
            label="Debug Mode"
            tooltip="Shows additional debug info in the terminal."
          />

          <CheckboxWithTooltip
            checked={jinja}
            onChange={(val) => {
              setJinja(val);
              if (!val) setJinjatools(false);
            }}
            label="Use Jinja"
            tooltip="Enables using jinja chat template formatting for chat completions endpoint."
          />

          <CheckboxWithTooltip
            checked={jinjatools}
            onChange={(val) => {
              setJinjatools(val);
              if (val) setJinja(true);
            }}
            label="Jinja for Tools"
            tooltip="Allows jinja even with tool calls. If unchecked, jinja will be disabled when tools are used."
          />
        </SimpleGrid>
      </div>

      {(jinja || jinjatools) && (
        <div>
          <Group>
            <Text size="sm" fw={500}>
              Jinja Kwargs
            </Text>
            <InfoTooltip label="Set additional fields for the Jinja JSON template parser, must be a valid JSON object." />
          </Group>
          <TextInput
            placeholder='e.g. {"enable_thinking":true}'
            value={jinjakwargs}
            onChange={(event) => setJinjakwargs(event.currentTarget.value)}
          />
        </div>
      )}

      <div>
        <Group justify="space-between">
          <Group>
            <Text size="sm" fw={500}>
              Additional Arguments
            </Text>
            <InfoTooltip label="Additional command line arguments to pass to the binary. Leave this empty if you don't know what they are." />
          </Group>
          <Button size="xs" variant="light" onClick={() => setCommandLineModalOpen(true)}>
            View Available Arguments
          </Button>
        </Group>
        <TextInput
          placeholder="Additional command line arguments"
          value={additionalArguments}
          onChange={(event) => setAdditionalArguments(event.currentTarget.value)}
        />
      </div>

      <div>
        <Group>
          <Text size="sm" fw={500}>
            Pre-Launch Commands
          </Text>
          <InfoTooltip label="Shell commands to run before launching. Useful for starting local services or custom APIs." />
        </Group>
        <Stack gap="xs">
          {preLaunchCommands.map((command, index) => (
            <Group key={`cmd-${index}-${command}`} gap="xs">
              <TextInput
                placeholder="Enter a shell command"
                value={command}
                onChange={(event) => {
                  const newCommands = [...preLaunchCommands];
                  newCommands[index] = event.currentTarget.value;
                  setPreLaunchCommands(newCommands);
                }}
                style={{ flex: 1 }}
              />
              <ActionIcon
                variant="subtle"
                color="red"
                disabled={preLaunchCommands.length === 1}
                aria-label={`Remove command ${index + 1}`}
                onClick={() => {
                  const newCommands = preLaunchCommands.filter((_, i) => i !== index);
                  setPreLaunchCommands(newCommands.length === 0 ? [''] : newCommands);
                }}
              >
                <Trash2 size={16} />
              </ActionIcon>
            </Group>
          ))}
          <Button
            variant="subtle"
            size="xs"
            leftSection={<Plus size={14} />}
            onClick={() => {
              setPreLaunchCommands([...preLaunchCommands, '']);
            }}
            style={{ alignSelf: 'flex-start' }}
          >
            Add Command
          </Button>
        </Stack>
      </div>

      <CommandLineArgumentsModal
        opened={commandLineModalOpen}
        onClose={() => setCommandLineModalOpen(false)}
        onAddArgument={handleAddArgument}
      />
    </Stack>
  );
};
