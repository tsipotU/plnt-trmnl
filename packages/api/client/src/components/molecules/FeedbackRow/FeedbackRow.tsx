import type { ButtonHTMLAttributes, ReactNode } from 'react';
import './FeedbackRow.css';

export type FeedbackTone = 'bug' | 'idea' | 'praise' | 'neutral';

export interface FeedbackRowProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type'> {
  /** Visual tone of the type pill. Maps to existing CSS variants. */
  tone?: FeedbackTone;
  /** Type chip label (free-form). Examples: "bug", "feature", "improvement". */
  typeLabel: ReactNode;
  /** Status string — "open", "fixed", "planned", "next", etc. Mono microcaps. */
  status?: ReactNode;
  /** ISO date or formatted date. Mono microcaps. */
  date?: ReactNode;
  /** Display-font title line. */
  title: ReactNode;
  /** Optional italic-serif body snippet. */
  snippet?: ReactNode;
}

/* Feedback list entry — type pill + status + date + title + snippet.
   Renders as a button (whole card tappable). The type pill carries a
   visual tone (bug→warn, idea→info, praise→accent, neutral→surface)
   independent of its label, so callers with their own categorisation
   (feature, improvement, etc.) can map to the closest tone. */
export function FeedbackRow({
  tone = 'neutral',
  typeLabel,
  status,
  date,
  title,
  snippet,
  className = '',
  ...rest
}: FeedbackRowProps) {
  return (
    <button
      type="button"
      className={`p7l-feedbackrow ${className}`.trim()}
      {...rest}
    >
      <span className="p7l-feedbackrow__meta">
        <span className={`p7l-feedbackrow__type p7l-feedbackrow__type--${tone}`}>
          {typeLabel}
        </span>
        {status && <span className="p7l-feedbackrow__status">{status}</span>}
        {date && <span className="p7l-feedbackrow__status">· {date}</span>}
      </span>
      <span className="p7l-feedbackrow__title">{title}</span>
      {snippet && <span className="p7l-feedbackrow__snippet">{snippet}</span>}
    </button>
  );
}
