import { describe, it, expect } from 'vitest';
import { getSeasonalAdjustedInterval, isInHeatingSeason } from './seasonal.js';
import type { Config } from '../config.js';

// Default config: heating season Oct 1 – Apr 1 (wrapping over year-end)
const defaultConfig: Pick<Config, 'heatingSeasonStart' | 'heatingSeasonEnd'> = {
  heatingSeasonStart: { month: 10, day: 1 },
  heatingSeasonEnd: { month: 4, day: 1 },
};

// Non-wrapping config for testing the simple case: Apr 15 – Sep 30
const summerConfig: Pick<Config, 'heatingSeasonStart' | 'heatingSeasonEnd'> = {
  heatingSeasonStart: { month: 4, day: 15 },
  heatingSeasonEnd: { month: 9, day: 30 },
};

describe('isInHeatingSeason', () => {
  describe('wrapping season (Oct–Apr)', () => {
    it('mid-December is inside the heating season', () => {
      expect(isInHeatingSeason('2025-12-15', defaultConfig)).toBe(true);
    });

    it('mid-February is inside the heating season', () => {
      expect(isInHeatingSeason('2026-02-15', defaultConfig)).toBe(true);
    });

    it('October 1 (start boundary) is inside', () => {
      expect(isInHeatingSeason('2025-10-01', defaultConfig)).toBe(true);
    });

    it('April 1 (end boundary) is inside', () => {
      expect(isInHeatingSeason('2026-04-01', defaultConfig)).toBe(true);
    });

    it('mid-July is outside the heating season', () => {
      expect(isInHeatingSeason('2025-07-15', defaultConfig)).toBe(false);
    });

    it('September 30 is outside the heating season', () => {
      expect(isInHeatingSeason('2025-09-30', defaultConfig)).toBe(false);
    });

    it('April 2 (just after end) is outside', () => {
      expect(isInHeatingSeason('2026-04-02', defaultConfig)).toBe(false);
    });
  });

  describe('non-wrapping season (Apr 15–Sep 30)', () => {
    it('mid-July is inside the non-wrapping season', () => {
      expect(isInHeatingSeason('2025-07-15', summerConfig)).toBe(true);
    });

    it('mid-December is outside the non-wrapping season', () => {
      expect(isInHeatingSeason('2025-12-15', summerConfig)).toBe(false);
    });

    it('April 15 (start boundary) is inside', () => {
      expect(isInHeatingSeason('2025-04-15', summerConfig)).toBe(true);
    });

    it('September 30 (end boundary) is inside', () => {
      expect(isInHeatingSeason('2025-09-30', summerConfig)).toBe(true);
    });

    it('April 14 (just before start) is outside', () => {
      expect(isInHeatingSeason('2025-04-14', summerConfig)).toBe(false);
    });
  });
});

describe('getSeasonalAdjustedInterval', () => {
  describe('outside heating season', () => {
    it('returns base interval unchanged when not in heating season', () => {
      expect(
        getSeasonalAdjustedInterval(7, 0.7, '2025-07-15', defaultConfig),
      ).toBe(7);
    });

    it('returns base interval unchanged even with modifier 1.0 outside season', () => {
      expect(
        getSeasonalAdjustedInterval(7, 1.0, '2025-07-15', defaultConfig),
      ).toBe(7);
    });
  });

  describe('inside heating season', () => {
    it('applies modifier during heating season', () => {
      // 7 * 0.7 = 4.9 → rounds to 5
      expect(
        getSeasonalAdjustedInterval(7, 0.7, '2026-01-15', defaultConfig),
      ).toBe(5);
    });

    it('works correctly mid-December (wrap-around heating season)', () => {
      // 10 * 0.8 = 8
      expect(
        getSeasonalAdjustedInterval(10, 0.8, '2025-12-15', defaultConfig),
      ).toBe(8);
    });

    it('works correctly mid-February (wrap-around heating season)', () => {
      // 14 * 0.5 = 7
      expect(
        getSeasonalAdjustedInterval(14, 0.5, '2026-02-15', defaultConfig),
      ).toBe(7);
    });

    it('modifier of 1.0 returns the same interval (no change)', () => {
      expect(
        getSeasonalAdjustedInterval(7, 1.0, '2026-01-15', defaultConfig),
      ).toBe(7);
    });

    it('applies minimum clamp: base 2 × 0.3 = 0.6 → rounds to 1', () => {
      // 2 * 0.3 = 0.6 → rounds to 1 → clamped to 1
      expect(
        getSeasonalAdjustedInterval(2, 0.3, '2026-01-15', defaultConfig),
      ).toBe(1);
    });

    it('very small result is clamped to minimum of 1', () => {
      // 1 * 0.1 = 0.1 → rounds to 0 → clamped to 1
      expect(
        getSeasonalAdjustedInterval(1, 0.1, '2026-01-15', defaultConfig),
      ).toBe(1);
    });
  });

  describe('invalid modifier values', () => {
    it('modifier of 0 returns base interval (treated as no modifier)', () => {
      expect(
        getSeasonalAdjustedInterval(7, 0, '2026-01-15', defaultConfig),
      ).toBe(7);
    });

    it('negative modifier returns base interval', () => {
      expect(
        getSeasonalAdjustedInterval(7, -0.5, '2026-01-15', defaultConfig),
      ).toBe(7);
    });

    it('null modifier returns base interval', () => {
      expect(
        getSeasonalAdjustedInterval(7, null, '2026-01-15', defaultConfig),
      ).toBe(7);
    });

    it('undefined modifier returns base interval', () => {
      expect(
        getSeasonalAdjustedInterval(7, undefined, '2026-01-15', defaultConfig),
      ).toBe(7);
    });
  });
});
