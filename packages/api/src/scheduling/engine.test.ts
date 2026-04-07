import { describe, it, expect } from 'vitest';
import { calculateNextWaterDate, calculateRepotAdjustment, isFertilizerDue } from './engine.js';

describe('calculateNextWaterDate', () => {
  it('adds interval days to last watered date', () => {
    expect(calculateNextWaterDate('2026-04-07', 7)).toBe('2026-04-14');
  });

  it('handles month boundaries', () => {
    expect(calculateNextWaterDate('2026-04-28', 7)).toBe('2026-05-05');
  });

  it('handles year boundaries', () => {
    expect(calculateNextWaterDate('2026-12-28', 7)).toBe('2027-01-04');
  });
});

describe('calculateRepotAdjustment', () => {
  it('increases interval when pot size increases', () => {
    const newInterval = calculateRepotAdjustment(7, 20, 30);
    expect(newInterval).toBeGreaterThan(7);
  });

  it('decreases interval when pot size decreases', () => {
    const newInterval = calculateRepotAdjustment(7, 30, 20);
    expect(newInterval).toBeLessThan(7);
  });

  it('applies dampened scaling — doubling pot does not double interval', () => {
    const newInterval = calculateRepotAdjustment(7, 15, 30);
    expect(newInterval).toBeLessThan(14);
    expect(newInterval).toBeGreaterThan(7);
  });

  it('enforces minimum 2 days', () => {
    const newInterval = calculateRepotAdjustment(3, 30, 5);
    expect(newInterval).toBeGreaterThanOrEqual(2);
  });

  it('keeps interval when pot size unchanged', () => {
    expect(calculateRepotAdjustment(7, 20, 20)).toBe(7);
  });
});

describe('isFertilizerDue', () => {
  it('returns true when enough weeks have passed', () => {
    expect(isFertilizerDue('2026-03-01', 4, new Date('2026-04-01'), false)).toBe(true);
  });

  it('returns false during heating season', () => {
    expect(isFertilizerDue('2026-03-01', 4, new Date('2026-04-01'), true)).toBe(false);
  });

  it('returns false when not enough time has passed', () => {
    expect(isFertilizerDue('2026-03-25', 4, new Date('2026-04-01'), false)).toBe(false);
  });

  it('returns true when never fertilized (null)', () => {
    expect(isFertilizerDue(null, 4, new Date('2026-04-01'), false)).toBe(true);
  });
});
