/**
 * Humanize a signed day-difference into the kitchen-sink-glance label that
 * fronts every "when does this need water?" surface — see #167.
 *
 *   sign(days) >  0 → future ("tomorrow", "in a few days", "in about a week", …)
 *   sign(days) === 0 → "today"
 *   sign(days) <  0 → past ("yesterday", "a few days ago", …)
 *
 * The buckets mirror how people actually think about watering rather than
 * exact day counts. Beyond two weeks the label falls back to a short date
 * because "in 17 days" reads as worse precision than the date itself.
 *
 * Keep this in sync with packages/renderer/src/render/humanize-days.ts —
 * same algorithm, different surface (TRMNL e-ink). When the algorithm
 * changes, change both.
 */

export interface HumanizeOptions {
  /** ISO date (YYYY-MM-DD) used to format the >14-day fallback label. */
  fallbackIsoDate?: string;
}

export function humanizeDaysFromToday(days: number, opts: HumanizeOptions = {}): string {
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  if (days === -1) return 'yesterday';
  if (days >= 2 && days <= 3) return 'in a few days';
  if (days <= -2 && days >= -3) return 'a few days ago';
  if (days >= 4 && days <= 7) return 'in about a week';
  if (days <= -4 && days >= -7) return 'about a week ago';
  if (days >= 8 && days <= 14) return 'in over a week';
  if (days <= -8 && days >= -14) return 'over a week ago';

  // 14+ days in either direction: a humanized label loses precision the
  // numeric form would have. Fall back to a short date when we have one.
  if (opts.fallbackIsoDate) {
    return formatShortDate(opts.fallbackIsoDate);
  }
  return days > 0 ? `in ${days} days` : `${Math.abs(days)} days ago`;
}

function formatShortDate(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number);
  if (!year || !month || !day) return iso;
  const d = new Date(Date.UTC(year, month - 1, day));
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}
