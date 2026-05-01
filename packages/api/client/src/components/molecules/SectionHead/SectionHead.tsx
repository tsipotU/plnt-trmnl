import type { HTMLAttributes, ReactNode } from 'react';
import './SectionHead.css';

export interface SectionHeadProps extends HTMLAttributes<HTMLDivElement> {
  /** Sans uppercase tracked label on the left. */
  label: ReactNode;
  /** Optional right-side action — typically a Chip toggleable, a small Button, or a count link. */
  action?: ReactNode;
}

/* Section divider with mono-eyebrow label and optional right-side action.
   Used between row groups on Today, Plant Detail, Settings, etc. — the
   small "Today's water · Water all (3)" pattern from the prototype. */
export function SectionHead({
  label,
  action,
  className = '',
  ...rest
}: SectionHeadProps) {
  return (
    <div className={`p7l-sectionhead ${className}`.trim()} {...rest}>
      <span className="p7l-sectionhead__label">{label}</span>
      {action && <span className="p7l-sectionhead__action">{action}</span>}
    </div>
  );
}
