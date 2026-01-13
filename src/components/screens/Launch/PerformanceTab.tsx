import { Group, NumberInput, SimpleGrid, Stack, Text } from '@mantine/core';
import { CheckboxWithTooltip } from '@/components/CheckboxWithTooltip';
import { InfoTooltip } from '@/components/InfoTooltip';
import { useLaunchConfigStore } from '@/stores/launchConfig';

export const PerformanceTab = () => {
  const {
    noshift,
    flashattention,
    lowvram,
    quantmatmul,
    usemmap,
    acceleration,
    moecpu,
    moeexperts,
    smartcache,
    pipelineparallel,
    setNoshift,
    setFlashattention,
    setLowvram,
    setQuantmatmul,
    setUsemmap,
    setMoecpu,
    setMoeexperts,
    setSmartcache,
    setPipelineparallel,
  } = useLaunchConfigStore();

  const isGpuAcceleration = acceleration === 'cuda' || acceleration === 'rocm';

  return (
    <Stack gap="md">
      <div>
        <SimpleGrid cols={3} spacing="lg" verticalSpacing="md">
          <CheckboxWithTooltip
            checked={!noshift}
            onChange={(checked) => setNoshift(!checked)}
            label="Context Shift"
            tooltip="Use Context Shifting to reduce reprocessing and improve performance with long contexts."
          />

          <CheckboxWithTooltip
            checked={noshift}
            onChange={setNoshift}
            label="No Shift"
            tooltip="Disable context shifting. May reduce performance but can help with compatibility issues."
          />

          <CheckboxWithTooltip
            checked={smartcache}
            onChange={setSmartcache}
            label="Smart Cache"
            tooltip="Enables intelligent context switching by saving KV cache snapshots to RAM. Requires fast forwarding."
          />
        </SimpleGrid>
      </div>

      <div>
        <SimpleGrid cols={3} spacing="lg" verticalSpacing="md">
          <CheckboxWithTooltip
            checked={flashattention}
            onChange={setFlashattention}
            label="Flash Attention"
            tooltip="Enable flash attention to reduce memory usage and improve performance. May produce incorrect answers for some prompts."
          />

          <CheckboxWithTooltip
            checked={lowvram && isGpuAcceleration}
            onChange={setLowvram}
            label="Low VRAM"
            tooltip={
              !isGpuAcceleration
                ? 'Low VRAM mode is only available for CUDA and ROCm accelerations.'
                : 'Avoid offloading KV Cache or scratch buffers to VRAM. Allows more layers to fit, but may result in a speed loss.'
            }
            disabled={!isGpuAcceleration}
          />

          <CheckboxWithTooltip
            checked={quantmatmul && isGpuAcceleration}
            onChange={setQuantmatmul}
            label="QuantMatMul"
            tooltip={
              !isGpuAcceleration
                ? 'QuantMatMul is only available for CUDA and ROCm accelerations.'
                : 'Enable MMQ mode to use finetuned kernels instead of default CuBLAS/HipBLAS for prompt processing.'
            }
            disabled={!isGpuAcceleration}
          />

          <CheckboxWithTooltip
            checked={pipelineparallel && isGpuAcceleration}
            onChange={setPipelineparallel}
            label="Pipeline Parallel"
            tooltip={
              !isGpuAcceleration
                ? 'Pipeline Parallelism is only available for multi-GPU setups.'
                : 'Enable Pipeline Parallelism for faster multi-GPU speeds but using more memory. Only active for multi-GPU setups.'
            }
            disabled={!isGpuAcceleration}
          />

          <CheckboxWithTooltip
            checked={usemmap}
            onChange={setUsemmap}
            label="MMAP"
            tooltip="Use memory-mapped file I/O for faster model loading. Recommended for most systems."
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
    </Stack>
  );
};
