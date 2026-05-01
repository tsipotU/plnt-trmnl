import type { HTMLAttributes, ReactNode } from 'react';
import './Chip.css';

export type ChipTone = 'neutral' | 'due' | 'overdue' | 'healthy' | 'dormant';

export interface ChipProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: ChipTone;
  /** Show the leading dot indicator. Defaults true for status tones, false for neutral. */
  dot?: boolean;
  /** Optional leading icon (e.g. <Pictogram />). Replaces the dot when present. */
  iconLeading?: ReactNode;
  children: ReactNode;
}

export function Chip({
  tone = 'neutral',
  dot,
  iconLeading,
  children,
  className = '',
  ...rest
}: ChipProps) {
  const showDot = dot ?? (tone !== 'neutral' && !iconLeading);

  return (
    <span
      className={`p7l-chip p7l-chip--${tone} ${className}`.trim()}
      {...rest}
    >
      {iconLeading && <span className="p7l-chip__icon">{iconLeading}</span>}
      {showDot && <span className="p7l-chip__dot" aria-hidden="true" />}
      <span className="p7l-chip__label">{children}</span>
    </span>
  );
}
