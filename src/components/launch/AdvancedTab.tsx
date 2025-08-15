import { Stack, Text, Group, TextInput, Checkbox } from '@mantine/core';
import { InfoTooltip } from '@/components/InfoTooltip';

interface AdvancedTabProps {
  additionalArguments: string;
  serverOnly: boolean;
  noshift: boolean;
  flashattention: boolean;
  noavx2: boolean;
  failsafe: boolean;
  onAdditionalArgumentsChange: (args: string) => void;
  onServerOnlyChange: (serverOnly: boolean) => void;
  onNoshiftChange: (noshift: boolean) => void;
  onFlashattentionChange: (flashattention: boolean) => void;
  onNoavx2Change: (noavx2: boolean) => void;
  onFailsafeChange: (failsafe: boolean) => void;
}

export const AdvancedTab = ({
  additionalArguments,
  serverOnly,
  noshift,
  flashattention,
  noavx2,
  failsafe,
  onAdditionalArgumentsChange,
  onServerOnlyChange,
  onNoshiftChange,
  onFlashattentionChange,
  onNoavx2Change,
  onFailsafeChange,
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
      <Stack gap="md">
        <Group gap="lg" align="flex-start" wrap="nowrap">
          <div style={{ minWidth: '200px' }}>
            <Group gap="xs" align="center">
              <Checkbox
                checked={serverOnly}
                onChange={(event) =>
                  onServerOnlyChange(event.currentTarget.checked)
                }
                label="Server-only mode"
              />
              <InfoTooltip label="In server-only mode, the KoboldAI Lite web UI won't be displayed. Use this if you'll be using your own frontend." />
            </Group>
          </div>

          <div style={{ minWidth: '200px' }}>
            <Group gap="xs" align="center">
              <Checkbox
                checked={!noshift}
                onChange={(event) =>
                  onNoshiftChange(!event.currentTarget.checked)
                }
                label="Use ContextShift"
              />
              <InfoTooltip label="Use Context Shifting to reduce reprocessing. Recommended" />
            </Group>
          </div>
        </Group>

        <Group gap="lg" align="flex-start" wrap="nowrap">
          <div style={{ minWidth: '200px' }}>
            <Group gap="xs" align="center">
              <Checkbox
                checked={flashattention}
                onChange={(event) =>
                  onFlashattentionChange(event.currentTarget.checked)
                }
                label="Use FlashAttention"
              />
              <InfoTooltip label="Enable flash attention for GGUF models." />
            </Group>
          </div>

          <div style={{ minWidth: '200px' }}>
            <Group gap="xs" align="center">
              <Checkbox
                checked={noavx2}
                onChange={(event) =>
                  onNoavx2Change(event.currentTarget.checked)
                }
                label="Disable AVX2"
              />
              <InfoTooltip label="Do not use AVX2 instructions, a slower compatibility mode for older devices." />
            </Group>
          </div>
        </Group>

        <Group gap="xs" align="center">
          <Checkbox
            checked={failsafe}
            onChange={(event) => onFailsafeChange(event.currentTarget.checked)}
            label="Failsafe"
          />
          <InfoTooltip label="Use failsafe mode, extremely slow CPU only compatibility mode that should work on all devices. Can be combined with useclblast if your device supports OpenCL." />
        </Group>
      </Stack>
    </div>
  </Stack>
);
