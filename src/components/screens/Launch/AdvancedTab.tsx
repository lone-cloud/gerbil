import {
  Stack,
  Group,
  Text,
  TextInput,
  NumberInput,
  Button,
  SimpleGrid,
  ActionIcon,
} from '@mantine/core';
import { useState, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { InfoTooltip } from '@/components/InfoTooltip';
import { CheckboxWithTooltip } from '@/components/CheckboxWithTooltip';
import { CommandLineArgumentsModal } from '@/components/screens/Launch/CommandLineArgumentsModal';
import { useLaunchConfigStore } from '@/stores/launchConfig';

export const AdvancedTab = () => {
  const {
    additionalArguments,
    preLaunchCommands,
    noshift,
    flashattention,
    noavx2,
    failsafe,
    lowvram,
    quantmatmul,
    usemmap,
    debugmode,
    backend,
    moecpu,
    moeexperts,
    setAdditionalArguments,
    setPreLaunchCommands,
    setNoshift,
    setFlashattention,
    setNoavx2,
    setFailsafe,
    setLowvram,
    setQuantmatmul,
    setUsemmap,
    setDebugmode,
    setMoecpu,
    setMoeexperts,
  } = useLaunchConfigStore();
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
    setAdditionalArguments(updatedArgs);
  };

  const isGpuBackend = backend === 'cuda' || backend === 'rocm';

  useEffect(() => {
    const detectAccelerationSupport = async () => {
      const support =
        await window.electronAPI.kobold.detectAccelerationSupport();

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

    void detectAccelerationSupport();
  }, []);

  return (
    <Stack gap="md">
      <div>
        <SimpleGrid cols={3} spacing="lg" verticalSpacing="md">
          <CheckboxWithTooltip
            checked={!noshift}
            onChange={(checked) => setNoshift(!checked)}
            label="Context Shift"
            tooltip="Use Context Shifting to reduce reprocessing."
          />

          <CheckboxWithTooltip
            checked={noshift}
            onChange={setNoshift}
            label="No Shift"
            tooltip="Don't use GPU layer shifting for incomplete offloads, which may reduce model performance."
          />

          <CheckboxWithTooltip
            checked={noavx2}
            onChange={setNoavx2}
            label="Disable AVX2"
            tooltip={
              !backendSupport?.noavx2 && !isLoading
                ? 'This binary does not support the no-AVX2 mode.'
                : 'Do not use AVX2 instructions, a slower compatibility mode for older devices.'
            }
            disabled={isLoading || !backendSupport?.noavx2}
          />

          <CheckboxWithTooltip
            checked={usemmap}
            onChange={setUsemmap}
            label="MMAP"
            tooltip="Use MMAP to load models when enabled."
          />

          <CheckboxWithTooltip
            checked={quantmatmul && isGpuBackend}
            onChange={setQuantmatmul}
            label="QuantMatMul"
            tooltip={
              !isGpuBackend
                ? 'QuantMatMul is only available for CUDA and ROCm backends.'
                : 'Enable MMQ mode to use finetuned kernels instead of default CuBLAS/HipBLAS for prompt processing.'
            }
            disabled={!isGpuBackend}
          />

          <CheckboxWithTooltip
            checked={failsafe}
            onChange={setFailsafe}
            label="Failsafe"
            tooltip={
              !backendSupport?.failsafe && !isLoading
                ? 'This binary does not support failsafe mode.'
                : 'Use failsafe mode, extremely slow CPU only compatibility mode that should work on all devices. Can be combined with useclblast if your device supports OpenCL.'
            }
            disabled={isLoading || !backendSupport?.failsafe}
          />

          <CheckboxWithTooltip
            checked={flashattention}
            onChange={setFlashattention}
            label="Flash Attention"
            tooltip="Enable flash attention to reduce memory usage. May produce incorrect answers for some prompts, but improves performance."
          />

          <CheckboxWithTooltip
            checked={lowvram && isGpuBackend}
            onChange={setLowvram}
            label="Low VRAM"
            tooltip={
              !isGpuBackend
                ? 'Low VRAM mode is only available for CUDA and ROCm backends.'
                : 'Avoid offloading KV Cache or scratch buffers to VRAM. Allows more layers to fit, but may result in a speed loss.'
            }
            disabled={!isGpuBackend}
          />

          <CheckboxWithTooltip
            checked={debugmode}
            onChange={setDebugmode}
            label="Debug Mode"
            tooltip="Shows additional debug info in the terminal."
          />
        </SimpleGrid>
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
                onChange={(value) => setMoeexperts(Number(value))}
                min={-1}
                max={128}
                step={1}
                size="sm"
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
                onChange={(value) => setMoecpu(Number(value) || 0)}
                min={0}
                max={999}
                step={1}
                size="sm"
              />
            </div>
          </Group>
        </Stack>
      </div>

      <div>
        <Group mb="xs" justify="space-between">
          <Group>
            <Text size="sm" fw={500}>
              Additional Arguments
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
            setAdditionalArguments(event.currentTarget.value)
          }
        />
      </div>

      <div>
        <Group mb="xs">
          <Text size="sm" fw={500}>
            Pre-Launch Commands
          </Text>
          <InfoTooltip label="Shell commands to run before launching. Useful for starting local services or custom APIs." />
        </Group>
        <Stack gap="xs">
          {preLaunchCommands.map((command, index) => (
            <Group key={index} gap="xs">
              <TextInput
                placeholder="Enter a shell command"
                value={command}
                onChange={(event) => {
                  const newCommands = [...preLaunchCommands];
                  newCommands[index] = event.currentTarget.value;
                  setPreLaunchCommands(newCommands);
                }}
                style={{ flex: 1 }}
              />
              <ActionIcon
                variant="subtle"
                color="red"
                disabled={preLaunchCommands.length === 1}
                onClick={() => {
                  const newCommands = preLaunchCommands.filter(
                    (_, i) => i !== index
                  );
                  setPreLaunchCommands(
                    newCommands.length === 0 ? [''] : newCommands
                  );
                }}
              >
                <Trash2 size={16} />
              </ActionIcon>
            </Group>
          ))}
          <Button
            variant="subtle"
            size="xs"
            leftSection={<Plus size={14} />}
            onClick={() => {
              setPreLaunchCommands([...preLaunchCommands, '']);
            }}
            style={{ alignSelf: 'flex-start' }}
          >
            Add Command
          </Button>
        </Stack>
      </div>

      <CommandLineArgumentsModal
        opened={commandLineModalOpen}
        onClose={() => setCommandLineModalOpen(false)}
        onAddArgument={handleAddArgument}
      />
    </Stack>
  );
};
