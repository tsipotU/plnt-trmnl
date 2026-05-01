import type { HTMLAttributes, ReactNode } from 'react';
import './RowState.css';

export type RowStateTone =
  | 'neutral'
  | 'due'
  | 'overdue'
  | 'healthy'
  | 'calibrating'
  | 'dormant'
  | 'just-added'
  | 'vacation';

export interface RowStateProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: RowStateTone;
  children: ReactNode;
}

/* Compact bordered pill for plant lifecycle states. Mirrors the prototype's
   .m-row-state exactly: rectangular (no radius), 0.5px ink-or-tone border,
   mono uppercase 9.5px tracked, tone-driven fills. Used by PlantRow,
   FeedbackRow, EnrichmentQueue, and anywhere a list row needs a state. */
export function RowState({
  tone = 'neutral',
  children,
  className = '',
  ...rest
}: RowStateProps) {
  return (
    <span
      className={`p7l-rowstate p7l-rowstate--${tone} ${className}`.trim()}
      {...rest}
    >
      {children}
    </span>
  );
}
