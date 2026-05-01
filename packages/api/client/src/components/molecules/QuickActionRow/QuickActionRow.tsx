import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react';
import './QuickActionRow.css';

export interface QuickActionRowProps extends HTMLAttributes<HTMLDivElement> {
  /** Number of equal-width cells. Default 5 (matches the prototype Plant Detail row). */
  cols?: 3 | 4 | 5;
  children: ReactNode;
}

/* Equal-column row of icon-and-label action buttons. Hairline separators
   between cells, hairline below the row. Compose with <QuickAction />
   children. */
export function QuickActionRow({
  cols = 5,
  children,
  className = '',
  ...rest
}: QuickActionRowProps) {
  return (
    <div
      className={`p7l-quickaction-row p7l-quickaction-row--cols-${cols} ${className}`.trim()}
      style={{ ...rest.style, gridTemplateColumns: `repeat(${cols}, 1fr)` }}
      {...rest}
    >
      {children}
    </div>
  );
}

export interface QuickActionProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Icon node above the label (typically a <Pictogram /> or emoji). */
  icon: ReactNode;
  /** Label below the icon. Sans uppercase 8.5px tracked. */
  label: ReactNode;
}

export function QuickAction({
  icon,
  label,
  className = '',
  type = 'button',
  ...rest
}: QuickActionProps) {
  return (
    <button
      type={type}
      className={`p7l-quickaction ${className}`.trim()}
      {...rest}
    >
      <span className="p7l-quickaction__icon">{icon}</span>
      <span className="p7l-quickaction__label">{label}</span>
    </button>
  );
}
