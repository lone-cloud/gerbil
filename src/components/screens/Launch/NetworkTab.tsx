import { Stack, Text, TextInput, Group } from '@mantine/core';
import { useState, useEffect } from 'react';
import { InfoTooltip } from '@/components/InfoTooltip';
import { CheckboxWithTooltip } from '@/components/CheckboxWithTooltip';
import { useLaunchConfig } from '@/hooks/useLaunchConfig';

export const NetworkTab = () => {
  const {
    port,
    host,
    multiuser,
    multiplayer,
    remotetunnel,
    nocertify,
    websearch,
    handlePortChange,
    handleHostChange,
    handleMultiuserChange,
    handleMultiplayerChange,
    handleRemotetunnelChange,
    handleNocertifyChange,
    handleWebsearchChange,
  } = useLaunchConfig();
  const [portInput, setPortInput] = useState(port?.toString() ?? '');

  useEffect(() => {
    setPortInput(port?.toString() ?? '');
  }, [port]);

  return (
    <Stack gap="md">
      <Group gap="lg" align="flex-start">
        <div>
          <Group gap="xs" align="center" mb="xs">
            <Text size="sm" fw={500}>
              Host
            </Text>
            <InfoTooltip label="The hostname or IP address on which KoboldCpp will bind its webserver to." />
          </Group>
          <TextInput
            placeholder="localhost"
            value={host}
            onChange={(event) => handleHostChange(event.currentTarget.value)}
          />
        </div>

        <div>
          <Group gap="xs" align="center" mb="xs">
            <Text size="sm" fw={500}>
              Port
            </Text>
            <InfoTooltip label="The port number on which KoboldCpp will listen for connections. Leave empty to use default port 5001." />
          </Group>
          <TextInput
            placeholder="5001"
            value={portInput}
            onChange={(event) => {
              const value = event.currentTarget.value;
              setPortInput(value);

              if (value === '') {
                return;
              }

              const numValue = Number(value);
              if (!isNaN(numValue) && numValue >= 1 && numValue <= 65535) {
                handlePortChange(numValue);
              }
            }}
            onBlur={(event) => {
              const value = event.currentTarget.value;
              if (value === '') {
                handlePortChange(undefined);
                setPortInput('');
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
              onChange={handleMultiuserChange}
              label="Multiuser Mode"
              tooltip="Allows requests by multiple different clients to be queued and handled in sequence."
            />

            <CheckboxWithTooltip
              checked={multiplayer}
              onChange={handleMultiplayerChange}
              label="Shared Multiplayer"
              tooltip="Hosts a shared multiplayer session"
            />
          </Group>

          <Group gap="lg" align="flex-start" wrap="nowrap">
            <CheckboxWithTooltip
              checked={remotetunnel}
              onChange={handleRemotetunnelChange}
              label="Remote Tunnel"
              tooltip="Creates a trycloudflare tunnel. Allows you to access koboldcpp from other devices over an internet URL."
            />

            <CheckboxWithTooltip
              checked={nocertify}
              onChange={handleNocertifyChange}
              label="No Certify Mode (Insecure)"
              tooltip="Allows insecure SSL connections. Use this if you have SSL cert errors and need to bypass certificate restrictions."
            />
          </Group>

          <CheckboxWithTooltip
            checked={websearch}
            onChange={handleWebsearchChange}
            label="Enable WebSearch"
            tooltip="Enable the local search engine proxy so Web Searches can be done."
          />
        </Stack>
      </div>
    </Stack>
  );
};
