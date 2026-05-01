import type { ButtonHTMLAttributes, ReactNode } from 'react';
import './ArchiveCard.css';

export interface ArchiveStamp {
  /** Stamp label (uppercase tracked). */
  label: ReactNode;
  /** When true, renders the inverted (ink bg + paper text) memorial style. */
  memorial?: boolean;
}

export interface ArchiveCardProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type'> {
  /** Leading icon — typically the archive-reason emoji (🕊️, 🎁, 📦, 📝). */
  leadingIcon?: ReactNode;
  /** Plant nickname. Display font, weight 500. */
  name: ReactNode;
  /** Italic-serif species name. */
  species?: ReactNode;
  /** Bordered mono stamps shown below the species (reason · date · days alive · etc). */
  stamps?: ReadonlyArray<ArchiveStamp>;
  /** Optional italic-serif archive note below the stamps. */
  note?: ReactNode;
}

/* Archive list entry — leading emoji + name + species + bordered stamps + optional note.
   Renders as a button (role=button + keyboard nav) since the whole card is tappable.
   The "memorial" stamp variant uses ink-on-paper inversion to mark plants that died. */
export function ArchiveCard({
  leadingIcon,
  name,
  species,
  stamps,
  note,
  className = '',
  ...rest
}: ArchiveCardProps) {
  return (
    <button
      type="button"
      className={`p7l-archcard ${className}`.trim()}
      {...rest}
    >
      <span className="p7l-archcard__inner">
        {leadingIcon && <span className="p7l-archcard__icon">{leadingIcon}</span>}
        <span className="p7l-archcard__body">
          <span className="p7l-archcard__name">{name}</span>
          {species && <span className="p7l-archcard__species">{species}</span>}
          {stamps && stamps.length > 0 && (
            <span className="p7l-archcard__stamps">
              {stamps.map((s, i) => (
                <span
                  key={i}
                  className={[
                    'p7l-archcard__stamp',
                    s.memorial && 'p7l-archcard__stamp--memorial',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  {s.label}
                </span>
              ))}
            </span>
          )}
          {note && <span className="p7l-archcard__note">"{note}"</span>}
        </span>
        <span className="p7l-archcard__chevron" aria-hidden="true">›</span>
      </span>
    </button>
  );
}
