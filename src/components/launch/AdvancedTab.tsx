import {
  Stack,
  Text,
  Group,
  TextInput,
  ActionIcon,
  Tooltip,
  Switch,
} from '@mantine/core';
import { Info } from 'lucide-react';

interface AdvancedTabProps {
  additionalArguments: string;
  serverOnly: boolean;
  onAdditionalArgumentsChange: (args: string) => void;
  onServerOnlyChange: (serverOnly: boolean) => void;
}

export const AdvancedTab = ({
  additionalArguments,
  serverOnly,
  onAdditionalArgumentsChange,
  onServerOnlyChange,
}: AdvancedTabProps) => (
  <Stack gap="lg">
    <div>
      <Group gap="xs" align="center" mb="xs">
        <Text size="sm" fw={500}>
          Additional arguments
        </Text>
        <Tooltip
          label="Additional command line arguments to pass to the KoboldCPP binary. Leave this empty if you don't know what they are."
          multiline
          w={300}
          withArrow
          color="dark"
          styles={{
            tooltip: {
              backgroundColor: 'var(--mantine-color-dark-6)',
              color: 'var(--mantine-color-gray-0)',
              border: '1px solid var(--mantine-color-dark-4)',
            },
          }}
        >
          <ActionIcon variant="subtle" size="xs" color="gray">
            <Info size={14} />
          </ActionIcon>
        </Tooltip>
      </Group>
      <TextInput
        placeholder="Additional command line arguments"
        value={additionalArguments}
        onChange={(event) =>
          onAdditionalArgumentsChange(event.currentTarget.value)
        }
      />
    </div>

    <div>
      <Group gap="xs" align="center" mb="xs">
        <Text size="sm" fw={500}>
          Server-only mode
        </Text>
        <Tooltip
          label="In server-only mode, the KoboldAI Lite web UI won't be displayed. Use this if you'll be using your own frontend to interact with the LLM."
          multiline
          w={300}
          withArrow
          color="dark"
          styles={{
            tooltip: {
              backgroundColor: 'var(--mantine-color-dark-6)',
              color: 'var(--mantine-color-gray-0)',
              border: '1px solid var(--mantine-color-dark-4)',
            },
          }}
        >
          <ActionIcon variant="subtle" size="xs" color="gray">
            <Info size={14} />
          </ActionIcon>
        </Tooltip>
      </Group>
      <Switch
        checked={serverOnly}
        onChange={(event) => onServerOnlyChange(event.currentTarget.checked)}
      />
    </div>
  </Stack>
);
