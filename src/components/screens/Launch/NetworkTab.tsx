import { Stack, Text, TextInput, Group, Checkbox } from '@mantine/core';
import { useState, useEffect } from 'react';
import { InfoTooltip } from '@/components/InfoTooltip';
import styles from '@/styles/layout.module.css';

interface NetworkTabProps {
  port: number | undefined;
  host: string;
  multiuser: boolean;
  multiplayer: boolean;
  remotetunnel: boolean;
  nocertify: boolean;
  websearch: boolean;
  onPortChange: (port: number | undefined) => void;
  onHostChange: (host: string) => void;
  onMultiuserChange: (multiuser: boolean) => void;
  onMultiplayerChange: (multiplayer: boolean) => void;
  onRemotetunnelChange: (remotetunnel: boolean) => void;
  onNocertifyChange: (nocertify: boolean) => void;
  onWebsearchChange: (websearch: boolean) => void;
}

export const NetworkTab = ({
  port,
  host,
  multiuser,
  multiplayer,
  remotetunnel,
  nocertify,
  websearch,
  onPortChange,
  onHostChange,
  onMultiuserChange,
  onMultiplayerChange,
  onRemotetunnelChange,
  onNocertifyChange,
  onWebsearchChange,
}: NetworkTabProps) => {
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
            onChange={(event) => onHostChange(event.currentTarget.value)}
            style={{ maxWidth: 200 }}
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
                onPortChange(numValue);
              }
            }}
            onBlur={(event) => {
              const value = event.currentTarget.value;
              if (value === '') {
                onPortChange(undefined);
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
            <div className={styles.minWidth200}>
              <Group gap="xs" align="center">
                <Checkbox
                  checked={multiuser}
                  onChange={(event) =>
                    onMultiuserChange(event.currentTarget.checked)
                  }
                  label="Multiuser Mode"
                />
                <InfoTooltip label="Allows requests by multiple different clients to be queued and handled in sequence." />
              </Group>
            </div>

            <div className={styles.minWidth200}>
              <Group gap="xs" align="center">
                <Checkbox
                  checked={multiplayer}
                  onChange={(event) =>
                    onMultiplayerChange(event.currentTarget.checked)
                  }
                  label="Shared Multiplayer"
                />
                <InfoTooltip label="Hosts a shared multiplayer session" />
              </Group>
            </div>
          </Group>

          <Group gap="lg" align="flex-start" wrap="nowrap">
            <div className={styles.minWidth200}>
              <Group gap="xs" align="center">
                <Checkbox
                  checked={remotetunnel}
                  onChange={(event) =>
                    onRemotetunnelChange(event.currentTarget.checked)
                  }
                  label="Remote Tunnel"
                />
                <InfoTooltip label="Creates a trycloudflare tunnel. Allows you to access koboldcpp from other devices over an internet URL." />
              </Group>
            </div>

            <div className={styles.minWidth200}>
              <Group gap="xs" align="center">
                <Checkbox
                  checked={nocertify}
                  onChange={(event) =>
                    onNocertifyChange(event.currentTarget.checked)
                  }
                  label="No Certify Mode (Insecure)"
                />
                <InfoTooltip label="Allows insecure SSL connections. Use this if you have SSL cert errors and need to bypass certificate restrictions." />
              </Group>
            </div>
          </Group>

          <Group gap="xs" align="center">
            <Checkbox
              checked={websearch}
              onChange={(event) =>
                onWebsearchChange(event.currentTarget.checked)
              }
              label="Enable WebSearch"
            />
            <InfoTooltip label="Enable the local search engine proxy so Web Searches can be done." />
          </Group>
        </Stack>
      </div>
    </Stack>
  );
};
