import type { HTMLAttributes, ReactNode } from 'react';
import './CareLogEntry.css';

export interface CareLogEntryProps extends HTMLAttributes<HTMLDivElement> {
  /** ISO date or formatted date string. Mono. */
  date: ReactNode;
  /** Event type — uppercase tracked. e.g. "watered", "fertilized", "pruned". */
  type: ReactNode;
  /** Optional small leading icon next to the type. */
  icon?: ReactNode;
  /** Optional italic-serif note body below the type. */
  note?: ReactNode;
}

/* Single entry in a plant's care log timeline. Two-column grid:
   date (74px mono) · type + optional note. Hairline below. */
export function CareLogEntry({
  date,
  type,
  icon,
  note,
  className = '',
  ...rest
}: CareLogEntryProps) {
  return (
    <article className={`p7l-carelog ${className}`.trim()} {...rest}>
      <time className="p7l-carelog__date">{date}</time>
      <div className="p7l-carelog__body">
        <div className="p7l-carelog__type">
          {icon && <span className="p7l-carelog__icon" aria-hidden="true">{icon}</span>}
          <span>{type}</span>
        </div>
        {note && <div className="p7l-carelog__note">{note}</div>}
      </div>
    </article>
  );
}
