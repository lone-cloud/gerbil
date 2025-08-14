import {
  Stack,
  Text,
  TextInput,
  Group,
  ActionIcon,
  Tooltip,
} from '@mantine/core';
import { Info } from 'lucide-react';

interface NetworkTabProps {
  port: number;
  host: string;
  onPortChange: (port: number) => void;
  onHostChange: (host: string) => void;
}

export const NetworkTab = ({
  port,
  host,
  onPortChange,
  onHostChange,
}: NetworkTabProps) => (
  <Stack gap="lg">
    {/* Port */}
    <div>
      <Group gap="xs" align="center" mb="xs">
        <Text size="sm" fw={500}>
          Port
        </Text>
        <Tooltip
          label="The port number on which KoboldCpp will listen for connections. Default is 5001."
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
        placeholder="5001"
        value={port.toString()}
        onChange={(event) =>
          onPortChange(Number(event.currentTarget.value) || 5001)
        }
        type="number"
        min={1}
        max={65535}
        w={120}
      />
    </div>

    {/* Host */}
    <div>
      <Group gap="xs" align="center" mb="xs">
        <Text size="sm" fw={500}>
          Host
        </Text>
        <Tooltip
          label="The hostname or IP address on which KoboldCpp will bind its webserver to."
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
        placeholder="localhost"
        value={host}
        onChange={(event) => onHostChange(event.currentTarget.value)}
        style={{ maxWidth: 200 }}
      />
    </div>
  </Stack>
);
