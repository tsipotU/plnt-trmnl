import type { HTMLAttributes, ReactNode } from 'react';
import './FilterRail.css';

export interface FilterRailProps extends HTMLAttributes<HTMLDivElement> {
  /** Render a hairline border at the bottom of the rail. Default true. */
  bordered?: boolean;
  /** Tighten vertical padding when stacked under another rail. Default false. */
  compact?: boolean;
  /** Toggleable Chip atoms. */
  children: ReactNode;
}

/* Horizontal-scrollable rail of toggleable Chip atoms. Used on PlantsList
   (state + category), Archive (reason), Feedback (type), and any other
   single- or multi-select filter row. The rail handles overflow scroll
   and chrome; the Chips handle selection state. */
export function FilterRail({
  bordered = true,
  compact = false,
  className = '',
  children,
  ...rest
}: FilterRailProps) {
  return (
    <div
      role="toolbar"
      aria-label="Filter"
      className={[
        'p7l-filterrail',
        bordered && 'p7l-filterrail--bordered',
        compact && 'p7l-filterrail--compact',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {children}
    </div>
  );
}
