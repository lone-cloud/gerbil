import { Stack, Checkbox, Group, Text, TextInput } from '@mantine/core';
import { useState, useEffect } from 'react';
import { InfoTooltip } from '@/components/InfoTooltip';
import { useLaunchConfig } from '@/hooks/useLaunchConfig';
import styles from '@/styles/layout.module.css';

export const AdvancedTab = () => {
  const {
    additionalArguments,
    noshift,
    flashattention,
    noavx2,
    failsafe,
    lowvram,
    quantmatmul,
    usemmap,
    backend,
    handleAdditionalArgumentsChange,
    handleNoshiftChange,
    handleFlashattentionChange,
    handleNoavx2Change,
    handleFailsafeChange,
    handleLowvramChange,
    handleQuantmatmulChange,
    handleUsemmapChange,
  } = useLaunchConfig();
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
    <Stack gap="md">
      <div>
        <Group gap="xs" align="center" mb="md">
          <Text size="sm" fw={600}>
            Performance Options
          </Text>
        </Group>
        <Stack gap="md">
          <Group gap="lg" align="flex-start" wrap="nowrap">
            <div className={styles.minWidth200}>
              <Group gap="xs" align="center">
                <Checkbox
                  checked={!noshift}
                  onChange={(event) =>
                    handleNoshiftChange(!event.currentTarget.checked)
                  }
                  label="Context Shift"
                />
                <InfoTooltip label="Use Context Shifting to reduce reprocessing." />
              </Group>
            </div>

            <div className={styles.minWidth200}>
              <Group gap="xs" align="center">
                <Checkbox
                  checked={noshift}
                  onChange={(event) =>
                    handleNoshiftChange(event.currentTarget.checked)
                  }
                  label="No Shift"
                />
                <InfoTooltip label="Don't use GPU layer shifting for incomplete offloads, which may reduce model performance." />
              </Group>
            </div>
          </Group>

          <Group gap="lg" align="flex-start" wrap="nowrap">
            <div className={styles.minWidth200}>
              <Group gap="xs" align="center">
                <Checkbox
                  checked={flashattention}
                  onChange={(event) =>
                    handleFlashattentionChange(event.currentTarget.checked)
                  }
                  label="Flash Attention"
                />
                <InfoTooltip label="Enable flash attention to reduce memory usage. May produce incorrect answers for some prompts, but improves performance." />
              </Group>
            </div>

            <div className={styles.minWidth200}>
              <Group gap="xs" align="center">
                <Checkbox
                  checked={lowvram}
                  onChange={(event) =>
                    handleLowvramChange(event.currentTarget.checked)
                  }
                  label="Low VRAM"
                  disabled={backend !== 'cuda' && backend !== 'rocm'}
                />
                <InfoTooltip
                  label={
                    backend !== 'cuda' && backend !== 'rocm'
                      ? 'Low VRAM mode is only available for CUDA and ROCm backends.'
                      : 'Avoid offloading KV Cache or scratch buffers to VRAM. Allows more layers to fit, but may result in a speed loss.'
                  }
                />
              </Group>
            </div>
          </Group>

          <Group gap="lg" align="flex-start" wrap="nowrap">
            <div className={styles.minWidth200}>
              <Group gap="xs" align="center">
                <Checkbox
                  checked={quantmatmul}
                  onChange={(event) =>
                    handleQuantmatmulChange(event.currentTarget.checked)
                  }
                  label="QuantMatMul"
                  disabled={backend !== 'cuda' && backend !== 'rocm'}
                />
                <InfoTooltip
                  label={
                    backend !== 'cuda' && backend !== 'rocm'
                      ? 'QuantMatMul is only available for CUDA and ROCm backends.'
                      : 'Enable MMQ mode to use finetuned kernels instead of default CuBLAS/HipBLAS for prompt processing.'
                  }
                />
              </Group>
            </div>

            <div className={styles.minWidth200}>
              <Group gap="xs" align="center">
                <Checkbox
                  checked={usemmap}
                  onChange={(event) =>
                    handleUsemmapChange(event.currentTarget.checked)
                  }
                  label="MMAP"
                />
                <InfoTooltip label="Use MMAP to load models when enabled." />
              </Group>
            </div>
          </Group>
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
            <div className={styles.minWidth200}>
              <Group gap="xs" align="center">
                <Checkbox
                  checked={noavx2}
                  onChange={(event) =>
                    handleNoavx2Change(event.currentTarget.checked)
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

            <div className={styles.minWidth200}>
              <Group gap="xs" align="center">
                <Checkbox
                  checked={failsafe}
                  onChange={(event) =>
                    handleFailsafeChange(event.currentTarget.checked)
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
            handleAdditionalArgumentsChange(event.currentTarget.value)
          }
        />
      </div>
    </Stack>
  );
};
