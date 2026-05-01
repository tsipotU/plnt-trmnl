import type { HTMLAttributes, ReactNode } from 'react';
import './EmptyState.css';

export type EmptyStateAlign = 'center' | 'left';

export interface EmptyStateProps extends HTMLAttributes<HTMLDivElement> {
  /** Center (default — most cases) or left-align (in-flow inside lists). */
  align?: EmptyStateAlign;
  /** Optional small action node below the message. */
  action?: ReactNode;
  children: ReactNode;
}

/* Italic serif placeholder. Used for empty lists, no-search-match,
   "all caught up" states. Quiet by design. */
export function EmptyState({
  align = 'center',
  action,
  className = '',
  children,
  ...rest
}: EmptyStateProps) {
  return (
    <div
      className={`p7l-empty p7l-empty--${align} ${className}`.trim()}
      role="status"
      {...rest}
    >
      <div className="p7l-empty__msg">{children}</div>
      {action && <div className="p7l-empty__action">{action}</div>}
    </div>
  );
}
