import type { HTMLAttributes, ReactNode } from 'react';
import './SettingsRow.css';

export interface SettingsRowProps extends HTMLAttributes<HTMLDivElement> {
  /** Sans 14px label on the left. */
  label: ReactNode;
  /** Optional smaller description below the label. Sans 12px ink-3, max-width applied. */
  description?: ReactNode;
  /** Trailing slot — typically a mono value, a Toggle, or a chevron (›). */
  trailing?: ReactNode;
  /** When provided, the row is interactive (cursor + hover surface + role=button). */
  onClick?: () => void;
}

/* Settings list row — label + optional description + trailing slot.
   The trailing slot is intentionally generic so callers can drop in
   a Toggle, a mono value, a chevron, or anything else. Hairline below.
   Renders as a div by default; if `onClick` is provided, becomes
   role="button" + tabindex=0 for keyboard nav. */
export function SettingsRow({
  label,
  description,
  trailing,
  onClick,
  className = '',
  ...rest
}: SettingsRowProps) {
  const interactive = Boolean(onClick);
  return (
    <div
      className={[
        'p7l-settingsrow',
        interactive && 'p7l-settingsrow--interactive',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      onClick={onClick}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={interactive ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      } : undefined}
      {...rest}
    >
      <div className="p7l-settingsrow__text">
        <div className="p7l-settingsrow__label">{label}</div>
        {description && <div className="p7l-settingsrow__desc">{description}</div>}
      </div>
      {trailing && <div className="p7l-settingsrow__trailing">{trailing}</div>}
    </div>
  );
}
