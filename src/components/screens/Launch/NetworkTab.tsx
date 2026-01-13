import { Group, Stack, Text, TextInput } from '@mantine/core';
import { CheckboxWithTooltip } from '@/components/CheckboxWithTooltip';
import { InfoTooltip } from '@/components/InfoTooltip';
import { useLaunchConfigStore } from '@/stores/launchConfig';

export const NetworkTab = () => {
  const {
    port,
    host,
    multiuser,
    multiplayer,
    remotetunnel,
    nocertify,
    websearch,
    setPort,
    setHost,
    setMultiuser,
    setMultiplayer,
    setRemotetunnel,
    setNocertify,
    setWebsearch,
  } = useLaunchConfigStore();

  return (
    <Stack gap="md">
      <Group gap="lg" align="flex-start">
        <div>
          <Group gap="xs" align="center" mb="xs">
            <Text size="sm" fw={500}>
              Host
            </Text>
            <InfoTooltip label="The hostname or IP address to bind the webserver to." />
          </Group>
          <TextInput
            placeholder="localhost"
            value={host}
            onChange={(event) => setHost(event.currentTarget.value)}
          />
        </div>

        <div>
          <Group gap="xs" align="center" mb="xs">
            <Text size="sm" fw={500}>
              Port
            </Text>
            <InfoTooltip label="The port number on which the server will listen for connections. Leave empty to use default port 5001." />
          </Group>
          <TextInput
            placeholder="5001"
            value={port?.toString() ?? ''}
            onChange={(event) => {
              const value = event.currentTarget.value;

              if (value === '') {
                setPort(undefined);
                return;
              }

              const numValue = Number(value);
              if (!Number.isNaN(numValue) && numValue >= 1 && numValue <= 65535) {
                setPort(numValue);
              }
            }}
            type="number"
            min={1}
            max={65535}
            w={120}
          />
        </div>
      </Group>

      <div>
        <Stack gap="md">
          <Group gap="lg" align="flex-start" wrap="nowrap">
            <CheckboxWithTooltip
              checked={multiuser}
              onChange={setMultiuser}
              label="Multiuser Mode"
              tooltip="Allows requests by multiple different clients to be queued and handled in sequence."
            />

            <CheckboxWithTooltip
              checked={multiplayer}
              onChange={setMultiplayer}
              label="Shared Multiplayer"
              tooltip="Hosts a shared multiplayer session"
            />
          </Group>

          <Group gap="lg" align="flex-start" wrap="nowrap">
            <CheckboxWithTooltip
              checked={remotetunnel}
              onChange={setRemotetunnel}
              label="Remote Tunnel"
              tooltip="Creates a cloudflare tunnel. Allows you to access your server from other devices over an internet URL."
            />

            <CheckboxWithTooltip
              checked={nocertify}
              onChange={setNocertify}
              label="No Certify Mode (Insecure)"
              tooltip="Allows insecure SSL connections. Use this if you have SSL cert errors and need to bypass certificate restrictions."
            />
          </Group>

          <CheckboxWithTooltip
            checked={websearch}
            onChange={setWebsearch}
            label="Enable WebSearch"
            tooltip="Enable the local search engine proxy so Web Searches can be done."
          />
        </Stack>
      </div>
    </Stack>
  );
};
