import type { HTMLAttributes, ReactNode } from 'react';
import './ConditionRow.css';

export type ConditionSeverity = 'info' | 'warning' | 'critical';

export interface ConditionRowProps extends HTMLAttributes<HTMLDivElement> {
  severity: ConditionSeverity;
  /** Condition name (display, weight 500, 14px). */
  name: ReactNode;
  /** Italic-serif symptoms description. */
  symptoms?: ReactNode;
  /** Sans-body remedy/treatment line. */
  remedy?: ReactNode;
  /** Right-side action node (typically a Resolve button). */
  action?: ReactNode;
}

/* Plant condition entry — severity badge + name/symptoms/remedy + action.
   Three-column grid that wraps content in the middle column. */
export function ConditionRow({
  severity,
  name,
  symptoms,
  remedy,
  action,
  className = '',
  ...rest
}: ConditionRowProps) {
  return (
    <article
      className={`p7l-condition ${className}`.trim()}
      {...rest}
    >
      <span className={`p7l-condition__sev p7l-condition__sev--${severity}`}>
        {severity}
      </span>
      <div className="p7l-condition__body">
        <div className="p7l-condition__name">{name}</div>
        {symptoms && <div className="p7l-condition__symptoms">{symptoms}</div>}
        {remedy && <div className="p7l-condition__remedy">{remedy}</div>}
      </div>
      {action && <div className="p7l-condition__action">{action}</div>}
    </article>
  );
}
