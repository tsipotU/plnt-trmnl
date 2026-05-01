import type { ButtonHTMLAttributes, ReactNode } from 'react';
import './FAB.css';

export interface FABProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Accessible label for screen readers (e.g. "Add plant"). Required. */
  label: string;
  /** Icon node. Defaults to a "+" character. Pass a <Pictogram /> for a richer icon. */
  icon?: ReactNode;
  /** Anchor corner. Defaults to bottom-right. */
  position?: 'bottom-right' | 'bottom-center' | 'static';
}

/* Floating action button. Round, ink-on-paper, shadow-3 lift.
   Per the prototype this anchors to the bottom-right of the viewport (or
   the m-app stage). Use position="static" inside non-anchored layouts. */
export function FAB({
  label,
  icon = '+',
  position = 'bottom-right',
  className = '',
  type = 'button',
  ...rest
}: FABProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={`p7l-fab p7l-fab--${position} ${className}`.trim()}
      {...rest}
    >
      {icon}
    </button>
  );
}
