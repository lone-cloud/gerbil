import { Modal } from '@/components/Modal';
import { Stack, Group, Text, Alert, rem } from '@mantine/core';
import { Info } from 'lucide-react';
import type { ModelAnalysis } from '@/types';

interface ModelAnalysisModalProps {
  opened: boolean;
  onClose: () => void;
  analysis: ModelAnalysis | null;
  loading?: boolean;
  error?: string;
}

interface InfoRowProps {
  label: string;
  value?: string | number;
}

const InfoRow = ({ label, value }: InfoRowProps) => {
  if (!value) return null;

  return (
    <Group gap="md" wrap="nowrap">
      <Text size="sm" c="dimmed" style={{ minWidth: rem(150) }}>
        {label}:
      </Text>
      <Text size="sm" fw={500}>
        {value}
      </Text>
    </Group>
  );
};

export const ModelAnalysisModal = ({
  opened,
  onClose,
  analysis,
  loading = false,
  error,
}: ModelAnalysisModalProps) => (
  <Modal
    opened={opened}
    onClose={onClose}
    title={
      <Group gap="xs">
        <Info size={20} />
        <Text>Model Analysis</Text>
      </Group>
    }
    showCloseButton
  >
    {loading && (
      <Text size="sm" c="dimmed">
        Analyzing model...
      </Text>
    )}

    {error && (
      <Alert color="red" title="Analysis Failed">
        {error}
      </Alert>
    )}

    {analysis && (
      <Stack gap="xs">
        {analysis.general.name && (
          <InfoRow label="Model Name" value={analysis.general.name} />
        )}
        <InfoRow label="Architecture" value={analysis.general.architecture} />
        {analysis.general.parameterCount && (
          <InfoRow label="Parameters" value={analysis.general.parameterCount} />
        )}
        <InfoRow label="File Size" value={analysis.general.fileSize} />

        {analysis.architecture.expertCount && (
          <InfoRow
            label="Expert Count (MoE)"
            value={analysis.architecture.expertCount}
          />
        )}
        {analysis.context.maxContextLength && (
          <InfoRow
            label="Max Context Length"
            value={analysis.context.maxContextLength}
          />
        )}
        {analysis.architecture.layers && (
          <InfoRow
            label="Layers / VRAM"
            value={`${analysis.architecture.layers} (${analysis.estimates.vramPerLayer || 'N/A'} per layer) = ${analysis.estimates.fullGpuVram}`}
          />
        )}
        {!analysis.architecture.layers && (
          <InfoRow label="Full VRAM" value={analysis.estimates.fullGpuVram} />
        )}
        <InfoRow label="Full RAM" value={analysis.estimates.systemRam} />
      </Stack>
    )}
  </Modal>
);
