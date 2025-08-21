import { Checkbox, Group } from '@mantine/core';
import { InfoTooltip } from '@/components/InfoTooltip';
import styles from '@/styles/layout.module.css';

interface CheckboxWithTooltipProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  tooltip: string;
  disabled?: boolean;
}

export const CheckboxWithTooltip = ({
  checked,
  onChange,
  label,
  tooltip,
  disabled = false,
}: CheckboxWithTooltipProps) => (
  <div className={styles.minWidth200}>
    <Group gap="xs" align="center">
      <Checkbox
        checked={checked}
        onChange={(event) => onChange(event.currentTarget.checked)}
        label={label}
        disabled={disabled}
      />
      <InfoTooltip label={tooltip} />
    </Group>
  </div>
);
