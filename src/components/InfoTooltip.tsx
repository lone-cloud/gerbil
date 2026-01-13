import { ActionIcon, Tooltip } from '@mantine/core';
import { Info } from 'lucide-react';

interface InfoTooltipProps {
  label: string;
  multiline?: boolean;
  width?: number;
}

export const InfoTooltip = ({ label, multiline = true, width = 300 }: InfoTooltipProps) => (
  <Tooltip label={label} multiline={multiline} w={width}>
    <ActionIcon variant="subtle" size="xs" color="gray">
      <Info size={14} />
    </ActionIcon>
  </Tooltip>
);
