import type { ButtonHTMLAttributes, ReactNode } from 'react';
import './FeedbackRow.css';

export type FeedbackType = 'bug' | 'idea' | 'praise';

export interface FeedbackRowProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type'> {
  /** Feedback category — drives the type pill color. */
  feedbackType: FeedbackType;
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
   Renders as a button (whole card tappable). The type pill is a small
   bordered+filled tag in one of three tones (bug→warn, idea→info,
   praise→accent). */
export function FeedbackRow({
  feedbackType,
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
        <span className={`p7l-feedbackrow__type p7l-feedbackrow__type--${feedbackType}`}>
          {feedbackType}
        </span>
        {status && <span className="p7l-feedbackrow__status">{status}</span>}
        {date && <span className="p7l-feedbackrow__status">· {date}</span>}
      </span>
      <span className="p7l-feedbackrow__title">{title}</span>
      {snippet && <span className="p7l-feedbackrow__snippet">{snippet}</span>}
    </button>
  );
}
