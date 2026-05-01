import type { HTMLAttributes, ReactNode } from 'react';
import './Callout.css';

export type CalloutTone = 'neutral' | 'info' | 'warn' | 'accent';

export interface CalloutProps extends HTMLAttributes<HTMLDivElement> {
  tone?: CalloutTone;
  children: ReactNode;
}

/* Left-bordered serif callout. Lighter than InfoCard (no full border, no
   header), louder than inline serif text. Used for guidance lines on
   AddPlant, AI prompt, TRMNL pairing, Notifications preview. */
export function Callout({ tone = 'neutral', className = '', children, ...rest }: CalloutProps) {
  return (
    <aside className={`p7l-callout p7l-callout--${tone} ${className}`.trim()} {...rest}>
      {children}
    </aside>
  );
}
