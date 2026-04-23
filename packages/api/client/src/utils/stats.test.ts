import { describe, it, expect } from 'vitest';
import {
  daysBetween,
  computeIntervalHistory,
  trendLabel,
  countWaterings,
  type StatsEvent,
} from './stats';

const ev = (event_type: string, new_value: string | null, created_at = '2026-04-01T00:00:00Z'): StatsEvent => ({
  event_type,
  new_value,
  created_at,
});

describe('daysBetween', () => {
  it('returns whole days between two ISO timestamps', () => {
    expect(daysBetween('2026-01-01T00:00:00Z', '2026-01-11T00:00:00Z')).toBe(10);
  });

  it('returns 0 for reversed order (never negative)', () => {
    expect(daysBetween('2026-01-11T00:00:00Z', '2026-01-01T00:00:00Z')).toBe(0);
  });
});

describe('computeIntervalHistory', () => {
  it('returns chronological interval sequence from API reverse-chron events', () => {
    // API returns newest first; helper should flip to oldest → newest.
    const events: StatsEvent[] = [
      ev('calibration', '9', '2026-03-01'),
      ev('watered', null, '2026-02-25'),
      ev('calibration', '8', '2026-02-15'),
      ev('calibration', '7', '2026-02-01'),
    ];
    expect(computeIntervalHistory(events)).toEqual([7, 8, 9]);
  });

  it('returns empty array when no calibration events', () => {
    expect(computeIntervalHistory([ev('watered', null)])).toEqual([]);
  });

  it('filters out non-numeric values', () => {
    const events: StatsEvent[] = [
      ev('calibration', 'not-a-number'),
      ev('calibration', '7'),
    ];
    expect(computeIntervalHistory(events)).toEqual([7]);
  });
});

describe('trendLabel', () => {
  it('returns null for fewer than 2 points', () => {
    expect(trendLabel([])).toBeNull();
    expect(trendLabel([7])).toBeNull();
  });

  it('reports "longer" when last > first', () => {
    expect(trendLabel([7, 8, 9])).toMatch(/longer/);
  });

  it('reports "shorter" when last < first', () => {
    expect(trendLabel([9, 7])).toMatch(/shorter/);
  });

  it('reports "stable" when first equals last', () => {
    expect(trendLabel([7, 8, 7])).toBe('Interval stable');
  });
});

describe('countWaterings', () => {
  it('counts only watered events', () => {
    const events: StatsEvent[] = [
      ev('watered', null),
      ev('watered', null),
      ev('calibration', '7'),
      ev('archived', null),
    ];
    expect(countWaterings(events)).toBe(2);
  });
});
