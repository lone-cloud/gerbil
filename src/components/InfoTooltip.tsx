import { ActionIcon } from '@mantine/core';
import { Info } from 'lucide-react';
import { StyledTooltip } from '@/components/StyledTooltip';

interface InfoTooltipProps {
  label: string;
  multiline?: boolean;
  width?: number;
}

export const InfoTooltip = ({
  label,
  multiline = true,
  width = 300,
}: InfoTooltipProps) => (
  <StyledTooltip label={label} multiline={multiline} w={width}>
    <ActionIcon variant="subtle" size="xs" color="gray">
      <Info size={14} />
    </ActionIcon>
  </StyledTooltip>
);
