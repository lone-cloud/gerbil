import { Group, Text } from '@mantine/core';
import { InfoTooltip } from '@/components/InfoTooltip';

interface LabelWithTooltipProps {
  label: string;
  tooltip?: string;
  fontWeight?: number;
  marginBottom?: string;
}

export const LabelWithTooltip = ({
  label,
  tooltip,
  fontWeight = 500,
  marginBottom = 'xs',
}: LabelWithTooltipProps) => (
  <Group gap="xs" align="center" mb={marginBottom}>
    <Text size="sm" fw={fontWeight}>
      {label}
    </Text>
    {tooltip && <InfoTooltip label={tooltip} />}
  </Group>
);
