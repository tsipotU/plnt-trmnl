import { describe, it, expect } from 'vitest';
import {
  applySeasonalMultipliers,
  getSeasonalAdjustedInterval,
  isInGrowingSeason,
  isInHeatingSeason,
} from './seasonal.js';
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

// Default growing season: Apr 1 – Sep 30
const defaultGrowingConfig: Pick<
  Config,
  'growingSeasonStart' | 'growingSeasonEnd' | 'growingSeasonMultiplier' | 'dormancyMultiplier'
> = {
  growingSeasonStart: { month: 4, day: 1 },
  growingSeasonEnd: { month: 9, day: 30 },
  growingSeasonMultiplier: 0.8,
  dormancyMultiplier: 1.3,
};

const fullConfig: Pick<
  Config,
  | 'heatingSeasonStart'
  | 'heatingSeasonEnd'
  | 'growingSeasonStart'
  | 'growingSeasonEnd'
  | 'growingSeasonMultiplier'
  | 'dormancyMultiplier'
> = {
  ...defaultConfig,
  ...defaultGrowingConfig,
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

describe('isInGrowingSeason', () => {
  it('mid-May is inside growing season (Apr 1 – Sep 30)', () => {
    expect(isInGrowingSeason('2026-05-15', defaultGrowingConfig)).toBe(true);
  });

  it('April 1 (start boundary) is inside', () => {
    expect(isInGrowingSeason('2026-04-01', defaultGrowingConfig)).toBe(true);
  });

  it('September 30 (end boundary) is inside', () => {
    expect(isInGrowingSeason('2026-09-30', defaultGrowingConfig)).toBe(true);
  });

  it('mid-January is outside growing season', () => {
    expect(isInGrowingSeason('2026-01-15', defaultGrowingConfig)).toBe(false);
  });

  it('October 1 is outside growing season', () => {
    expect(isInGrowingSeason('2026-10-01', defaultGrowingConfig)).toBe(false);
  });
});

describe('applySeasonalMultipliers', () => {
  it('applies growing-season multiplier in May (no heating)', () => {
    // 10 * 1.0 (no heating mod) * 0.8 (growing) = 8
    const result = applySeasonalMultipliers({
      baseInterval: 10,
      perPlantHeatingModifier: 0.7, // ignored: not in heating season
      today: '2026-05-15',
      config: fullConfig,
    });
    expect(result.interval).toBe(8);
    expect(result.growingApplied).toBe(true);
    expect(result.dormancyApplied).toBe(false);
    expect(result.heatingApplied).toBe(false);
  });

  it('applies dormancy multiplier in mid-January (outside growing, but heating modifier 1.0 = no-op)', () => {
    // 10 * 1.0 * 1.3 (dormancy) = 13
    const result = applySeasonalMultipliers({
      baseInterval: 10,
      perPlantHeatingModifier: 1.0,
      today: '2026-01-15',
      config: fullConfig,
    });
    expect(result.interval).toBe(13);
    expect(result.dormancyApplied).toBe(true);
    expect(result.growingApplied).toBe(false);
    // heating season active but modifier is 1.0 → effectively no-op
    expect(result.heatingApplied).toBe(false);
  });

  it('stacks heating × dormancy multiplicatively', () => {
    // 10 * 0.7 (heating) * 1.3 (dormancy) = 9.1 → 9
    const result = applySeasonalMultipliers({
      baseInterval: 10,
      perPlantHeatingModifier: 0.7,
      today: '2026-01-15',
      config: fullConfig,
    });
    expect(result.interval).toBe(9);
    expect(result.heatingApplied).toBe(true);
    expect(result.dormancyApplied).toBe(true);
    expect(result.growingApplied).toBe(false);
  });

  it('stacks heating × growing when both overlap (narrow shoulder)', () => {
    // Apr 1 is inside both heating (Oct–Apr 1) and growing (Apr 1–Sep 30)
    // 10 * 0.7 * 0.8 = 5.6 → 6
    const result = applySeasonalMultipliers({
      baseInterval: 10,
      perPlantHeatingModifier: 0.7,
      today: '2026-04-01',
      config: fullConfig,
    });
    expect(result.interval).toBe(6);
    expect(result.heatingApplied).toBe(true);
    expect(result.growingApplied).toBe(true);
    expect(result.dormancyApplied).toBe(false);
  });

  it('clamps result to minimum of 1', () => {
    // 2 * 0.1 * 0.8 = 0.16 → 0 → clamped to 1
    const result = applySeasonalMultipliers({
      baseInterval: 2,
      perPlantHeatingModifier: 0.1,
      today: '2026-01-15',
      config: fullConfig,
    });
    expect(result.interval).toBeGreaterThanOrEqual(1);
  });

  it('treats null/undefined/invalid heating modifier as 1.0 (no heating adjustment)', () => {
    // 10 * 1.0 * 1.3 (dormancy) = 13
    const result = applySeasonalMultipliers({
      baseInterval: 10,
      perPlantHeatingModifier: null,
      today: '2026-01-15',
      config: fullConfig,
    });
    expect(result.interval).toBe(13);
    expect(result.heatingApplied).toBe(false);
  });

  it('reason string enumerates all applied layers', () => {
    const result = applySeasonalMultipliers({
      baseInterval: 10,
      perPlantHeatingModifier: 0.7,
      today: '2026-04-01',
      config: fullConfig,
    });
    expect(result.reason).toMatch(/heating/);
    expect(result.reason).toMatch(/growing/);
  });

  it('reason is empty/falsy when no layers applied (summer, no heating, growing season → but growing IS applied)', () => {
    // In default config Apr-Sep, growing IS applied. Use a year-round non-growing + non-heating config:
    const trivialConfig: Pick<
      Config,
      | 'heatingSeasonStart'
      | 'heatingSeasonEnd'
      | 'growingSeasonStart'
      | 'growingSeasonEnd'
      | 'growingSeasonMultiplier'
      | 'dormancyMultiplier'
    > = {
      ...defaultConfig,
      ...defaultGrowingConfig,
      growingSeasonMultiplier: 1.0,
      dormancyMultiplier: 1.0,
    };
    const result = applySeasonalMultipliers({
      baseInterval: 10,
      perPlantHeatingModifier: 1.0,
      today: '2026-05-15',
      config: trivialConfig,
    });
    expect(result.interval).toBe(10);
    expect(result.heatingApplied).toBe(false);
    // 1.0 multiplier → intervalChanged=false even though in-season
  });
});
