export interface StatsEvent {
  event_type: string;
  new_value: string | null;
  created_at: string;
}

export function daysBetween(a: string, b: string): number {
  const ms = new Date(b).getTime() - new Date(a).getTime();
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
}

/**
 * Extract the chronological calibration interval sequence from an events list.
 * Events come from the API in reverse-chronological order; we re-reverse so the
 * returned array reads oldest → newest for UI display ("7 → 8 → 9").
 */
export function computeIntervalHistory(events: StatsEvent[]): number[] {
  return events
    .filter((e) => e.event_type === 'calibration' && e.new_value)
    .slice()
    .reverse()
    .map((e) => Number(e.new_value))
    .filter((n) => Number.isFinite(n));
}

export function trendLabel(history: number[]): string | null {
  if (history.length < 2) return null;
  const first = history[0];
  const last = history[history.length - 1];
  if (last > first) return 'Interval trending longer — soil retaining moisture well';
  if (last < first) return 'Interval trending shorter — soil drying faster';
  return 'Interval stable';
}

export function countWaterings(events: StatsEvent[]): number {
  return events.filter((e) => e.event_type === 'watered').length;
}
