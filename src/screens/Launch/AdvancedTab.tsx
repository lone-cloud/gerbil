import { Stack, Text, Group, TextInput, Checkbox } from '@mantine/core';
import { useState, useEffect } from 'react';
import { InfoTooltip } from '@/components/InfoTooltip';

interface AdvancedTabProps {
  additionalArguments: string;
  noshift: boolean;
  flashattention: boolean;
  noavx2: boolean;
  failsafe: boolean;
  lowvram: boolean;
  quantmatmul: boolean;
  backend: string;
  onAdditionalArgumentsChange: (args: string) => void;
  onNoshiftChange: (noshift: boolean) => void;
  onFlashattentionChange: (flashattention: boolean) => void;
  onNoavx2Change: (noavx2: boolean) => void;
  onFailsafeChange: (failsafe: boolean) => void;
  onLowvramChange: (lowvram: boolean) => void;
  onQuantmatmulChange: (quantmatmul: boolean) => void;
}

export const AdvancedTab = ({
  additionalArguments,
  noshift,
  flashattention,
  noavx2,
  failsafe,
  lowvram,
  quantmatmul,
  backend,
  onAdditionalArgumentsChange,
  onNoshiftChange,
  onFlashattentionChange,
  onNoavx2Change,
  onFailsafeChange,
  onLowvramChange,
  onQuantmatmulChange,
}: AdvancedTabProps) => {
  const [backendSupport, setBackendSupport] = useState<{
    noavx2: boolean;
    failsafe: boolean;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const detectBackendSupport = async () => {
      try {
        const currentBinaryInfo =
          await window.electronAPI.kobold.getCurrentBinaryInfo();
        if (currentBinaryInfo?.path) {
          const support = await window.electronAPI.kobold.detectBackendSupport(
            currentBinaryInfo.path
          );
          setBackendSupport({
            noavx2: support.noavx2,
            failsafe: support.failsafe,
          });
        }
      } catch (error) {
        window.electronAPI.logs.logError(
          'Failed to detect backend support:',
          error as Error
        );
        setBackendSupport({ noavx2: false, failsafe: false });
      } finally {
        setIsLoading(false);
      }
    };

    void detectBackendSupport();
  }, []);

  return (
    <Stack gap="lg">
      <div>
        <Group gap="xs" align="center" mb="md">
          <Text size="sm" fw={600}>
            Performance Options
          </Text>
        </Group>
        <Stack gap="md">
          <Group gap="lg" align="flex-start" wrap="nowrap">
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
          </Group>

          {(backend === 'cuda' || backend === 'rocm') && (
            <Group gap="lg" align="flex-start" wrap="nowrap">
              <div style={{ minWidth: '200px' }}>
                <Group gap="xs" align="center">
                  <Checkbox
                    checked={lowvram}
                    onChange={(event) =>
                      onLowvramChange(event.currentTarget.checked)
                    }
                    label="Low VRAM"
                  />
                  <InfoTooltip
                    label="Avoid offloading KV Cache or scratch buffers to VRAM.&#10;Allows more layers to fit, but may result in a speed loss."
                  />
                </Group>
              </div>

              <div style={{ minWidth: '200px' }}>
                <Group gap="xs" align="center">
                  <Checkbox
                    checked={quantmatmul}
                    onChange={(event) =>
                      onQuantmatmulChange(event.currentTarget.checked)
                    }
                    label="QuantMatMul"
                  />
                  <InfoTooltip label="Enable MMQ mode to use finetuned kernels instead of default CuBLAS/HipBLAS for prompt processing." />
                </Group>
              </div>
            </Group>
          )}
        </Stack>
      </div>

      <div>
        <Group gap="xs" align="center" mb="md">
          <Text size="sm" fw={600}>
            Hardware Compatibility
          </Text>
        </Group>
        <Stack gap="md">
          <Group gap="lg" align="flex-start" wrap="nowrap">
            <div style={{ minWidth: '200px' }}>
              <Group gap="xs" align="center">
                <Checkbox
                  checked={noavx2}
                  onChange={(event) =>
                    onNoavx2Change(event.currentTarget.checked)
                  }
                  label="Disable AVX2"
                  disabled={isLoading || !backendSupport?.noavx2}
                />
                <InfoTooltip
                  label={
                    !backendSupport?.noavx2 && !isLoading
                      ? 'This binary does not support the no-AVX2 mode.'
                      : 'Do not use AVX2 instructions, a slower compatibility mode for older devices.'
                  }
                />
              </Group>
            </div>

            <div style={{ minWidth: '200px' }}>
              <Group gap="xs" align="center">
                <Checkbox
                  checked={failsafe}
                  onChange={(event) =>
                    onFailsafeChange(event.currentTarget.checked)
                  }
                  label="Failsafe"
                  disabled={isLoading || !backendSupport?.failsafe}
                />
                <InfoTooltip
                  label={
                    !backendSupport?.failsafe && !isLoading
                      ? 'This binary does not support failsafe mode.'
                      : 'Use failsafe mode, extremely slow CPU only compatibility mode that should work on all devices. Can be combined with useclblast if your device supports OpenCL.'
                  }
                />
              </Group>
            </div>
          </Group>
        </Stack>
      </div>

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
    </Stack>
  );
};
