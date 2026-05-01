import type { ButtonHTMLAttributes, ReactNode } from 'react';
import './RadioRow.css';

export interface RadioRowProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onChange'> {
  /** Sans label on the right of the circle. */
  label: ReactNode;
  /** Optional italic-serif description below the label. */
  description?: ReactNode;
  /** Selected state. */
  checked?: boolean;
  /** Called when the row is clicked. */
  onSelect?: () => void;
  /** When grouped, the value passed back to the parent on select. */
  value?: string;
  /** Group name for ARIA (and form semantics). */
  name?: string;
}

/* Radio option row — circle + label + optional italic-serif description.
   Renders as <button role="radio">; the parent component owns the
   selection state and renders one RadioRow per option. */
export function RadioRow({
  label,
  description,
  checked = false,
  onSelect,
  value,
  name,
  className = '',
  ...rest
}: RadioRowProps) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      data-name={name}
      data-value={value}
      onClick={onSelect}
      className={[
        'p7l-radiorow',
        checked && 'p7l-radiorow--active',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      <span className="p7l-radiorow__circle" aria-hidden="true" />
      <span className="p7l-radiorow__text">
        <span className="p7l-radiorow__label">{label}</span>
        {description && <span className="p7l-radiorow__desc">{description}</span>}
      </span>
    </button>
  );
}
