import type { ElementType, HTMLAttributes, ReactNode } from 'react';
import './SectionHead.css';

export interface SectionHeadProps extends HTMLAttributes<HTMLDivElement> {
  /** Sans uppercase tracked label on the left. */
  label: ReactNode;
  /** Optional right-side action — typically a Chip toggleable, a small Button, or a count link. */
  action?: ReactNode;
  /** Element used for the label. Default 'span' (visual-only divider).
      Pass 'h2' / 'h3' / 'h4' on pages where the section is a true outline
      level (e.g. Settings, About) so screen readers + role-based queries
      find it as a heading. */
  as?: ElementType;
}

/* Section divider with mono-eyebrow label and optional right-side action.
   Used between row groups on Today, Plant Detail, Settings, etc. — the
   small "Today's water · Water all (3)" pattern from the prototype. */
export function SectionHead({
  label,
  action,
  as: LabelTag = 'span',
  className = '',
  ...rest
}: SectionHeadProps) {
  return (
    <div className={`p7l-sectionhead ${className}`.trim()} {...rest}>
      <LabelTag className="p7l-sectionhead__label">{label}</LabelTag>
      {action && <span className="p7l-sectionhead__action">{action}</span>}
    </div>
  );
}
