import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { loadConfig } from './config.js';

describe('loadConfig', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('returns valid config when all required vars are set', () => {
    process.env.PORT_API = '3900';
    process.env.DATABASE_PATH = '/data/test.db';
    process.env.BACKUP_DIR = '/backups';
    process.env.CALIBRATION_DEADLINE_HOUR = '12';
    process.env.HEATING_SEASON_START = '10-01';
    process.env.HEATING_SEASON_END = '04-01';

    const config = loadConfig();
    expect(config.port).toBe(3900);
    expect(config.databasePath).toBe('/data/test.db');
    expect(config.calibrationDeadlineHour).toBe(12);
    expect(config.heatingSeasonStart).toEqual({ month: 10, day: 1 });
  });

  it('throws when required var is missing', () => {
    delete process.env.DATABASE_PATH;
    expect(() => loadConfig()).toThrow('DATABASE_PATH');
  });

  it('uses defaults for optional vars', () => {
    process.env.DATABASE_PATH = '/data/test.db';
    const config = loadConfig();
    expect(config.port).toBe(3900);
    expect(config.calibrationDeadlineHour).toBe(12);
  });

  describe('dry-soil / growing-season knobs (#36)', () => {
    beforeEach(() => {
      process.env.DATABASE_PATH = '/data/test.db';
    });

    it('defaults growing season to Apr 1 – Sep 30', () => {
      delete process.env.GROWING_SEASON_START;
      delete process.env.GROWING_SEASON_END;
      const config = loadConfig();
      expect(config.growingSeasonStart).toEqual({ month: 4, day: 1 });
      expect(config.growingSeasonEnd).toEqual({ month: 9, day: 30 });
    });

    it('defaults DRY_DAYS_BASE to 7', () => {
      delete process.env.DRY_DAYS_BASE;
      expect(loadConfig().dryDaysBase).toBe(7);
    });

    it('defaults DORMANCY_MULTIPLIER to 1.3', () => {
      delete process.env.DORMANCY_MULTIPLIER;
      expect(loadConfig().dormancyMultiplier).toBeCloseTo(1.3);
    });

    it('defaults GROWING_SEASON_MULTIPLIER to 0.8', () => {
      delete process.env.GROWING_SEASON_MULTIPLIER;
      expect(loadConfig().growingSeasonMultiplier).toBeCloseTo(0.8);
    });

    it('parses custom GROWING_SEASON_START/END env vars', () => {
      process.env.GROWING_SEASON_START = '03-15';
      process.env.GROWING_SEASON_END = '10-15';
      const config = loadConfig();
      expect(config.growingSeasonStart).toEqual({ month: 3, day: 15 });
      expect(config.growingSeasonEnd).toEqual({ month: 10, day: 15 });
    });

    it('parses custom multiplier values', () => {
      process.env.DORMANCY_MULTIPLIER = '1.5';
      process.env.GROWING_SEASON_MULTIPLIER = '0.7';
      process.env.DRY_DAYS_BASE = '5';
      const config = loadConfig();
      expect(config.dormancyMultiplier).toBeCloseTo(1.5);
      expect(config.growingSeasonMultiplier).toBeCloseTo(0.7);
      expect(config.dryDaysBase).toBe(5);
    });

    it('clamps DRY_DAYS_BASE to minimum of 2', () => {
      process.env.DRY_DAYS_BASE = '0';
      expect(loadConfig().dryDaysBase).toBe(2);
    });

    it('falls back to default multiplier when non-positive', () => {
      process.env.DORMANCY_MULTIPLIER = '-1';
      expect(loadConfig().dormancyMultiplier).toBeCloseTo(1.3);
      process.env.GROWING_SEASON_MULTIPLIER = '0';
      expect(loadConfig().growingSeasonMultiplier).toBeCloseTo(0.8);
    });
  });
});
