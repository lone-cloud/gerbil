import {
  Stack,
  Group,
  Text,
  TextInput,
  NumberInput,
  Button,
} from '@mantine/core';
import { useState, useEffect } from 'react';
import { InfoTooltip } from '@/components/InfoTooltip';
import { CheckboxWithTooltip } from '@/components/CheckboxWithTooltip';
import { CommandLineArgumentsModal } from '@/components/screens/Launch/CommandLineArgumentsModal';
import { useLaunchConfig } from '@/hooks/useLaunchConfig';

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
    moecpu,
    moeexperts,
    handleAdditionalArgumentsChange,
    handleNoshiftChange,
    handleFlashattentionChange,
    handleNoavx2Change,
    handleFailsafeChange,
    handleLowvramChange,
    handleQuantmatmulChange,
    handleUsemmapChange,
    handleMoecpuChange,
    handleMoeexpertsChange,
  } = useLaunchConfig();
  const [commandLineModalOpen, setCommandLineModalOpen] = useState(false);
  const [backendSupport, setBackendSupport] = useState<{
    noavx2: boolean;
    failsafe: boolean;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const handleAddArgument = (newArgument: string) => {
    const currentArgs = additionalArguments.trim();
    const updatedArgs = currentArgs
      ? `${currentArgs} ${newArgument}`
      : newArgument;
    handleAdditionalArgumentsChange(updatedArgs);
  };

  const isGpuBackend = backend === 'cuda' || backend === 'rocm';

  useEffect(() => {
    const detectBackendSupport = async () => {
      const support = await window.electronAPI.kobold.detectBackendSupport();

      if (support) {
        setBackendSupport({
          noavx2: support.noavx2,
          failsafe: support.failsafe,
        });
      } else {
        setBackendSupport({ noavx2: false, failsafe: false });
      }

      setIsLoading(false);
    };

    void detectBackendSupport();
  }, []);

  return (
    <Stack gap="md">
      <div>
        <Stack gap="md">
          <Group gap="lg" align="flex-start" wrap="nowrap">
            <CheckboxWithTooltip
              checked={!noshift}
              onChange={(checked) => handleNoshiftChange(!checked)}
              label="Context Shift"
              tooltip="Use Context Shifting to reduce reprocessing."
            />

            <CheckboxWithTooltip
              checked={noshift}
              onChange={handleNoshiftChange}
              label="No Shift"
              tooltip="Don't use GPU layer shifting for incomplete offloads, which may reduce model performance."
            />
          </Group>

          <Group gap="lg" align="flex-start" wrap="nowrap">
            <CheckboxWithTooltip
              checked={flashattention}
              onChange={handleFlashattentionChange}
              label="Flash Attention"
              tooltip="Enable flash attention to reduce memory usage. May produce incorrect answers for some prompts, but improves performance."
            />

            <CheckboxWithTooltip
              checked={usemmap}
              onChange={handleUsemmapChange}
              label="MMAP"
              tooltip="Use MMAP to load models when enabled."
            />
          </Group>

          <Group gap="lg" align="flex-start" wrap="nowrap">
            <CheckboxWithTooltip
              checked={quantmatmul && isGpuBackend}
              onChange={handleQuantmatmulChange}
              label="QuantMatMul"
              tooltip={
                !isGpuBackend
                  ? 'QuantMatMul is only available for CUDA and ROCm backends.'
                  : 'Enable MMQ mode to use finetuned kernels instead of default CuBLAS/HipBLAS for prompt processing.'
              }
              disabled={!isGpuBackend}
            />

            <CheckboxWithTooltip
              checked={lowvram && isGpuBackend}
              onChange={handleLowvramChange}
              label="Low VRAM"
              tooltip={
                !isGpuBackend
                  ? 'Low VRAM mode is only available for CUDA and ROCm backends.'
                  : 'Avoid offloading KV Cache or scratch buffers to VRAM. Allows more layers to fit, but may result in a speed loss.'
              }
              disabled={!isGpuBackend}
            />
          </Group>

          <Group gap="lg" align="flex-start" wrap="nowrap">
            <CheckboxWithTooltip
              checked={noavx2}
              onChange={handleNoavx2Change}
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
              onChange={handleFailsafeChange}
              label="Failsafe"
              tooltip={
                !backendSupport?.failsafe && !isLoading
                  ? 'This binary does not support failsafe mode.'
                  : 'Use failsafe mode, extremely slow CPU only compatibility mode that should work on all devices. Can be combined with useclblast if your device supports OpenCL.'
              }
              disabled={isLoading || !backendSupport?.failsafe}
            />
          </Group>
        </Stack>
      </div>

      <div>
        <Stack gap="md">
          <Group gap="lg" align="flex-start" wrap="nowrap">
            <div style={{ flex: 1, minWidth: 200 }}>
              <Group gap="xs" align="center" mb="xs">
                <Text size="sm" fw={500}>
                  MoE Experts
                </Text>
                <InfoTooltip label="How many experts to use for MoE models. Set to -1 to follow GGUF metadata (default), or specify a specific number of experts." />
              </Group>
              <NumberInput
                value={moeexperts}
                onChange={(value) =>
                  handleMoeexpertsChange(Number(value) || -1)
                }
                min={-1}
                max={128}
                step={1}
                size="sm"
                placeholder="-1"
              />
            </div>

            <div style={{ flex: 1, minWidth: 200 }}>
              <Group gap="xs" align="center" mb="xs">
                <Text size="sm" fw={500}>
                  MoE CPU Layers
                </Text>
                <InfoTooltip label="Keep the Mixture of Experts (MoE) weights of the first N layers in the CPU. Set to 0 to disable (default), or specify the number of layers to keep on CPU." />
              </Group>
              <NumberInput
                value={moecpu}
                onChange={(value) => handleMoecpuChange(Number(value) || 0)}
                min={0}
                max={999}
                step={1}
                size="sm"
                placeholder="0"
              />
            </div>
          </Group>
        </Stack>
      </div>

      <div>
        <Group mb="md" justify="space-between">
          <Group>
            <Text size="sm" fw={500}>
              Additional arguments
            </Text>
            <InfoTooltip label="Additional command line arguments to pass to the binary. Leave this empty if you don't know what they are." />
          </Group>
          <Button
            size="xs"
            variant="light"
            onClick={() => setCommandLineModalOpen(true)}
          >
            View Available Arguments
          </Button>
        </Group>
        <TextInput
          placeholder="Additional command line arguments"
          value={additionalArguments}
          onChange={(event) =>
            handleAdditionalArgumentsChange(event.currentTarget.value)
          }
        />
      </div>

      <CommandLineArgumentsModal
        opened={commandLineModalOpen}
        onClose={() => setCommandLineModalOpen(false)}
        onAddArgument={handleAddArgument}
      />
    </Stack>
  );
};
