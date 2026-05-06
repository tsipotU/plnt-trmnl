import { describe, it, expect } from 'vitest';
import { humanizeDaysFromToday } from './humanize-days.js';

// Mirrors packages/api/client/src/utils/humanize-days.test.ts — keep these
// suites in sync. If the algorithm diverges, one of the two will fail.

describe('humanizeDaysFromToday (renderer)', () => {
  it.each([
    [0, 'today'],
    [1, 'tomorrow'],
    [-1, 'yesterday'],
    [2, 'in a few days'],
    [3, 'in a few days'],
    [-2, 'a few days ago'],
    [-3, 'a few days ago'],
    [4, 'in about a week'],
    [7, 'in about a week'],
    [-4, 'about a week ago'],
    [-7, 'about a week ago'],
    [8, 'in over a week'],
    [14, 'in over a week'],
    [-8, 'over a week ago'],
    [-14, 'over a week ago'],
  ])('days=%i → "%s"', (days, expected) => {
    expect(humanizeDaysFromToday(days)).toBe(expected);
  });

  it('past 14 days falls back to date when given', () => {
    expect(humanizeDaysFromToday(20, { fallbackIsoDate: '2026-05-22' })).toBe('May 22');
    expect(humanizeDaysFromToday(-30, { fallbackIsoDate: '2026-04-06' })).toBe('Apr 6');
  });

  it('past 14 days falls back to numeric when no date given', () => {
    expect(humanizeDaysFromToday(20)).toBe('in 20 days');
    expect(humanizeDaysFromToday(-30)).toBe('30 days ago');
  });
});
