import { Group, Text } from '@mantine/core';
import { InfoTooltip } from '@/components/InfoTooltip';

interface SectionHeaderProps {
  title: string;
  tooltip?: string;
  fontWeight?: number;
  marginBottom?: string;
}

export const SectionHeader = ({
  title,
  tooltip,
  fontWeight = 600,
  marginBottom = 'md',
}: SectionHeaderProps) => (
  <Group gap="xs" align="center" mb={marginBottom}>
    <Text size="sm" fw={fontWeight}>
      {title}
    </Text>
    {tooltip && <InfoTooltip label={tooltip} />}
  </Group>
);
