import type { ButtonHTMLAttributes, ReactNode } from 'react';
import './PlantRow.css';

export interface PlantRowProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type'> {
  /** 48×48 framed slot for the plant pictogram or thumbnail. */
  pictogram?: ReactNode;
  /** Plant nickname or display name. Display font, tight tracking. */
  name: ReactNode;
  /** Latin or species name. Italic serif. */
  species?: ReactNode;
  /** Mono uppercase trail line — typically location · cycle · meta. */
  meta?: ReactNode;
  /** State pill on the right (typically a <RowState />). */
  state?: ReactNode;
}

/* List row for plants. Three-column grid: pictogram · text · state.
   Renders as <button> for keyboard nav + active highlight. The state
   slot is a pure ReactNode so callers compose it from RowState (or
   anything else) — keeps PlantRow decoupled from plant data shape. */
export function PlantRow({
  pictogram,
  name,
  species,
  meta,
  state,
  className = '',
  ...rest
}: PlantRowProps) {
  return (
    <button
      type="button"
      className={`p7l-plantrow ${className}`.trim()}
      {...rest}
    >
      <span className="p7l-plantrow__pic" aria-hidden={!pictogram}>
        {pictogram}
      </span>
      <span className="p7l-plantrow__text">
        <span className="p7l-plantrow__name">{name}</span>
        {species && <span className="p7l-plantrow__species">{species}</span>}
        {meta && <span className="p7l-plantrow__meta">{meta}</span>}
      </span>
      {state && <span className="p7l-plantrow__state">{state}</span>}
    </button>
  );
}
