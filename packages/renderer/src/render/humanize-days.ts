/**
 * Humanize a signed day-difference into the same kitchen-sink-glance label
 * the SPA uses. Mirror of packages/api/client/src/utils/humanize-days.ts —
 * same algorithm, different surface (TRMNL e-ink). When the algorithm
 * changes, change both. See #167.
 *
 * Renderer-side this only fires for past values (overdue plants), but the
 * helper accepts the full signed range to stay symmetric with the SPA copy
 * — easier to reason about in tests, and future surfaces (next-watering
 * humanization on the e-ink) get it for free.
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
