import type { HTMLAttributes, ReactNode } from 'react';
import './StatRow.css';

export interface StatRowProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  /** Number of columns. Default 3 (matches the prototype Today screen). */
  cols?: 2 | 3 | 4;
}

/* Equal-column stat strip with hairline borders top + bottom and between
   cells. Compose with <Stat /> children. */
export function StatRow({
  children,
  cols = 3,
  className = '',
  ...rest
}: StatRowProps) {
  return (
    <div
      className={`p7l-statrow p7l-statrow--cols-${cols} ${className}`.trim()}
      style={{ ...rest.style, gridTemplateColumns: `repeat(${cols}, 1fr)` }}
      {...rest}
    >
      {children}
    </div>
  );
}

export interface StatProps extends HTMLAttributes<HTMLDivElement> {
  /** Big numeral. Display font, 24px, tight tracking. */
  num: ReactNode;
  /** Mono uppercase tracked label below. */
  label: ReactNode;
  /** Recolor the numeral (e.g. var(--highlight) for a ceremonial number). */
  accent?: string;
}

export function Stat({ num, label, accent, className = '', ...rest }: StatProps) {
  return (
    <div className={`p7l-stat ${className}`.trim()} {...rest}>
      <div className="p7l-stat__num" style={accent ? { color: accent } : undefined}>{num}</div>
      <div className="p7l-stat__label">{label}</div>
    </div>
  );
}
