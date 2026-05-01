import type { ButtonHTMLAttributes, ReactNode } from 'react';
import './PhotoStripCell.css';

export type PhotoStripCellVariant = 'image' | 'add';

export interface PhotoStripCellProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: PhotoStripCellVariant;
  /** Visible content for the cell — typically an <img>, <Pictogram />, or "+" indicator. */
  children?: ReactNode;
  /** Date overlay shown bottom-left for image cells. Mono microtype. */
  date?: ReactNode;
  /** Accessible label (e.g. "Photo from 2026-04-15" or "Add photo"). */
  label: string;
}

/* Single cell of a horizontal photo strip. Two variants:
   - "image": framed with optional date overlay
   - "add":   dashed border + "+" affordance for an upload trigger
   Layout (the strip itself) is page-level — typically a flex row with
   horizontal scroll. The cell handles only its own framing. */
export function PhotoStripCell({
  variant = 'image',
  children,
  date,
  label,
  className = '',
  type = 'button',
  ...rest
}: PhotoStripCellProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={[
        'p7l-photocell',
        `p7l-photocell--${variant}`,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      <span className="p7l-photocell__inner">{children}</span>
      {variant === 'image' && date && (
        <span className="p7l-photocell__date">{date}</span>
      )}
    </button>
  );
}
