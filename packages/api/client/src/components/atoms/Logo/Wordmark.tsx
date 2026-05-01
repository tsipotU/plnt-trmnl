import type { CSSProperties } from 'react';

export interface WordmarkProps {
  /** Pixel size of the wordmark — sets fontSize. */
  size?: number;
  /** Override color. Defaults to currentColor. */
  color?: string;
  className?: string;
  style?: CSSProperties;
}

/* The daily-driver mark. Source Serif 4, weight 600, tight tracking.
   Inherits color from currentColor by default — set it via parent CSS. */
export function Wordmark({
  size = 48,
  color,
  className,
  style,
}: WordmarkProps) {
  return (
    <span
      className={className}
      style={{
        fontFamily: 'var(--font-serif)',
        fontSize: size,
        fontWeight: 600,
        letterSpacing: '-0.04em',
        lineHeight: 1,
        color: color ?? 'currentColor',
        display: 'inline-block',
        ...style,
      }}
      aria-label="p7l"
    >
      p7l
    </span>
  );
}
