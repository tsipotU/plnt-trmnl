import type { HTMLAttributes, ReactNode } from 'react';
import './RowState.css';

export type RowStateTone =
  | 'neutral'
  | 'due'
  | 'overdue'
  | 'healthy'
  | 'dormant'
  | 'dialed-in';

export interface RowStateProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: RowStateTone;
  /** Hide the leading dot. Useful when a row already has an iconified leading column. */
  dotOff?: boolean;
  children: ReactNode;
}

/* Compact status pill for dense list rows. Smaller and lighter than Chip:
   no background fill, microtype mono label, 5×5 dot. Use Chip for richer
   contexts (card chrome, detail headers). */
export function RowState({
  tone = 'neutral',
  dotOff = false,
  children,
  className = '',
  ...rest
}: RowStateProps) {
  return (
    <span
      className={`p7l-rowstate p7l-rowstate--${tone} ${className}`.trim()}
      {...rest}
    >
      {!dotOff && <span className="p7l-rowstate__dot" aria-hidden="true" />}
      <span className="p7l-rowstate__label">{children}</span>
    </span>
  );
}
