import type { CSSProperties } from 'react';
import { Select } from '@mantine/core';
import type { ComboboxItem } from '@mantine/core';
import { LabelWithTooltip } from '@/components/LabelWithTooltip';

interface SelectWithTooltipProps {
  label: string;
  tooltip: string;
  value: string;
  onChange: (value: string | null, option: ComboboxItem) => void;
  data: { value: string; label: string }[];
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
