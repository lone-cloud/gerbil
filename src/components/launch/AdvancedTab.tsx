import { Stack, Text, Group, TextInput, Checkbox } from '@mantine/core';
import { InfoTooltip } from '@/components/InfoTooltip';

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
        <InfoTooltip label="Additional command line arguments to pass to the KoboldCPP binary. Leave this empty if you don't know what they are." />
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
      <Group gap="xs" align="center">
        <Checkbox
          checked={serverOnly}
          onChange={(event) => onServerOnlyChange(event.currentTarget.checked)}
          label="Server-only mode"
        />
        <InfoTooltip label="In server-only mode, the KoboldAI Lite web UI won't be displayed. Use this if you'll be using your own frontend." />
      </Group>
    </div>
  </Stack>
);
