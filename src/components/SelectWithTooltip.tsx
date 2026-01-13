import type { ComboboxItem } from '@mantine/core';
import type { CSSProperties } from 'react';
import { LabelWithTooltip } from '@/components/LabelWithTooltip';
import { Select } from '@/components/Select';
import type { SelectOption } from '@/types';

interface SelectWithTooltipProps {
  label: string;
  tooltip: string;
  value: string;
  onChange: (value: string | null, option: ComboboxItem) => void;
  data: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  clearable?: boolean;
  style?: CSSProperties;
}

export const SelectWithTooltip = ({
  label,
  tooltip,
  value,
  onChange,
  data,
  placeholder,
  disabled = false,
  clearable = false,
  style,
}: SelectWithTooltipProps) => (
  <div style={style}>
    <LabelWithTooltip label={label} tooltip={tooltip} />
    <Select
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      data={data}
      disabled={disabled}
      clearable={clearable}
    />
  </div>
);
