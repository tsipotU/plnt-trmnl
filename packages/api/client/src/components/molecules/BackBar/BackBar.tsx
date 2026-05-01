import type { HTMLAttributes, ReactNode } from 'react';
import './BackBar.css';

export interface BackBarProps extends HTMLAttributes<HTMLElement> {
  onBack: () => void;
  /** Back button label. Defaults to "← Back". Pass a custom string for screens like "← Settings". */
  backLabel?: ReactNode;
  /** Mono-tracked context caption next to the back button. */
  eyebrow?: ReactNode;
  /** Right-side actions slot (e.g. archive icon). */
  actions?: ReactNode;
}

/* Sticky bar at the top of nested screens (Plant Detail, Memorial, etc.).
   Back button + optional eyebrow context + optional right-side actions.
   Like TopBar, the device safe-area padding is the parent layout's job. */
export function BackBar({
  onBack,
  backLabel = '← Back',
  eyebrow,
  actions,
  className = '',
  ...rest
}: BackBarProps) {
  return (
    <header className={`p7l-backbar ${className}`.trim()} {...rest}>
      <button type="button" className="p7l-backbar__back" onClick={onBack}>
        {backLabel}
      </button>
      {eyebrow && <span className="p7l-backbar__eyebrow">{eyebrow}</span>}
      {actions && <span className="p7l-backbar__actions">{actions}</span>}
    </header>
  );
}
