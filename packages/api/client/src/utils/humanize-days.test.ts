import { describe, it, expect } from 'vitest';
import { humanizeDaysFromToday } from './humanize-days';

describe('humanizeDaysFromToday', () => {
  describe('exact-day labels', () => {
    it.each([
      [0, 'today'],
      [1, 'tomorrow'],
      [-1, 'yesterday'],
    ])('days=%i → "%s"', (days, expected) => {
      expect(humanizeDaysFromToday(days)).toBe(expected);
    });
  });

  describe('a-few-days bucket (2 to 3 / -2 to -3)', () => {
    it.each([
      [2, 'in a few days'],
      [3, 'in a few days'],
      [-2, 'a few days ago'],
      [-3, 'a few days ago'],
    ])('days=%i → "%s"', (days, expected) => {
      expect(humanizeDaysFromToday(days)).toBe(expected);
    });
  });

  describe('about-a-week bucket (4 to 7 / -4 to -7)', () => {
    it.each([
      [4, 'in about a week'],
      [5, 'in about a week'],
      [6, 'in about a week'],
      [7, 'in about a week'],
      [-4, 'about a week ago'],
      [-7, 'about a week ago'],
    ])('days=%i → "%s"', (days, expected) => {
      expect(humanizeDaysFromToday(days)).toBe(expected);
    });
  });

  describe('over-a-week bucket (8 to 14 / -8 to -14)', () => {
    it.each([
      [8, 'in over a week'],
      [14, 'in over a week'],
      [-8, 'over a week ago'],
      [-14, 'over a week ago'],
    ])('days=%i → "%s"', (days, expected) => {
      expect(humanizeDaysFromToday(days)).toBe(expected);
    });
  });

  describe('14+ days falls back to date or numeric', () => {
    it('uses fallbackIsoDate when provided', () => {
      expect(humanizeDaysFromToday(20, { fallbackIsoDate: '2026-05-22' })).toBe('May 22');
      expect(humanizeDaysFromToday(-30, { fallbackIsoDate: '2026-04-06' })).toBe('Apr 6');
    });

    it('falls back to numeric form when no date is given', () => {
      expect(humanizeDaysFromToday(20)).toBe('in 20 days');
      expect(humanizeDaysFromToday(-30)).toBe('30 days ago');
    });
  });

  describe('boundary values', () => {
    it('15 days is past the over-a-week bucket', () => {
      expect(humanizeDaysFromToday(15)).toBe('in 15 days');
      expect(humanizeDaysFromToday(-15)).toBe('15 days ago');
    });

    it('14 days is the last day of the over-a-week bucket', () => {
      expect(humanizeDaysFromToday(14)).toBe('in over a week');
      expect(humanizeDaysFromToday(-14)).toBe('over a week ago');
    });
  });
});
