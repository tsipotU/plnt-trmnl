import { useState, type ButtonHTMLAttributes } from 'react';
import './Toggle.css';

export type ToggleSize = 'sm' | 'md';

type ToggleAttributes = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onChange' | 'onClick'>;

export interface ToggleProps extends ToggleAttributes {
  /** Controlled checked state. Pair with `onCheckedChange`. */
  checked?: boolean;
  /** Initial state for uncontrolled mode. */
  defaultChecked?: boolean;
  onCheckedChange?: (next: boolean) => void;
  size?: ToggleSize;
  label?: string;
}

export function Toggle({
  checked,
  defaultChecked = false,
  onCheckedChange,
  size = 'md',
  disabled = false,
  label,
  className = '',
  ...rest
}: ToggleProps) {
  const isControlled = checked !== undefined;
  const [internalChecked, setInternalChecked] = useState(defaultChecked);
  const value = isControlled ? checked : internalChecked;

  const handleToggle = () => {
    if (disabled) return;
    const next = !value;
    if (!isControlled) setInternalChecked(next);
    onCheckedChange?.(next);
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      aria-label={label}
      disabled={disabled}
      onClick={handleToggle}
      className={[
        'p7l-toggle',
        `p7l-toggle--${size}`,
        value && 'p7l-toggle--on',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      <span className="p7l-toggle__thumb" aria-hidden="true" />
    </button>
  );
}
