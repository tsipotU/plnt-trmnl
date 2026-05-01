import type { HTMLAttributes, ReactNode } from 'react';
import './InfoCard.css';

export type InfoCardTone = 'neutral' | 'info' | 'warn' | 'accent' | 'success';

export interface InfoCardProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  tone?: InfoCardTone;
  /** Mono uppercase header. Optional — when omitted, the card is body-only. */
  title?: ReactNode;
  children: ReactNode;
}

/* In-flow informational card — full border, optional mono header, serif body.
   Distinct from Banner (atom, row-shaped notice with icon) and Callout
   (left-border-only, no header). Use for "About this plant", calibration
   notes, archive notes, principles lists, AI prompt explainers. */
export function InfoCard({
  tone = 'neutral',
  title,
  className = '',
  children,
  ...rest
}: InfoCardProps) {
  return (
    <article
      className={`p7l-infocard p7l-infocard--${tone} ${className}`.trim()}
      {...rest}
    >
      {title && <header className="p7l-infocard__title">{title}</header>}
      <div className="p7l-infocard__body">{children}</div>
    </article>
  );
}
