import { describe, it, expect } from 'vitest';
import { calculateWaterAmount, isHeatingSeasonActive } from './water-calculator.js';

describe('calculateWaterAmount', () => {
  it('calculates correct amount for Monstera in 25cm pot', () => {
    const ml = calculateWaterAmount({
      potSizeCm: 25, waterRatio: 0.035,
      isHeatingSeason: false, heatingSeasonModifier: 0.85,
    });
    // pi * 12.5^2 * 21.25 * 0.035 = ~365ml
    expect(ml).toBeGreaterThan(350);
    expect(ml).toBeLessThan(380);
  });

  it('applies heating season modifier', () => {
    const normal = calculateWaterAmount({
      potSizeCm: 25, waterRatio: 0.035,
      isHeatingSeason: false, heatingSeasonModifier: 0.85,
    });
    const heating = calculateWaterAmount({
      potSizeCm: 25, waterRatio: 0.035,
      isHeatingSeason: true, heatingSeasonModifier: 0.85,
    });
    expect(heating).toBeCloseTo(normal * 0.85, 0);
  });

  it('returns 0 for zero pot size', () => {
    expect(calculateWaterAmount({ potSizeCm: 0, waterRatio: 0.035, isHeatingSeason: false, heatingSeasonModifier: 0.85 })).toBe(0);
  });
});

describe('isHeatingSeasonActive', () => {
  it('returns true in January (mid-heating season)', () => {
    expect(isHeatingSeasonActive(new Date('2026-01-15'), { month: 10, day: 1 }, { month: 4, day: 1 })).toBe(true);
  });

  it('returns true in November', () => {
    expect(isHeatingSeasonActive(new Date('2026-11-15'), { month: 10, day: 1 }, { month: 4, day: 1 })).toBe(true);
  });

  it('returns false in July', () => {
    expect(isHeatingSeasonActive(new Date('2026-07-15'), { month: 10, day: 1 }, { month: 4, day: 1 })).toBe(false);
  });

  it('returns false on April 2 (just after end)', () => {
    expect(isHeatingSeasonActive(new Date('2026-04-02'), { month: 10, day: 1 }, { month: 4, day: 1 })).toBe(false);
  });

  it('returns true on October 1 (start date)', () => {
    expect(isHeatingSeasonActive(new Date('2026-10-01'), { month: 10, day: 1 }, { month: 4, day: 1 })).toBe(true);
  });
});
