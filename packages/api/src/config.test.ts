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
    process.env.N8N_ENRICHMENT_WEBHOOK_URL = 'http://n8n/webhook';
    process.env.N8N_ENRICHMENT_MAX_RETRIES = '10';
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
    process.env.N8N_ENRICHMENT_WEBHOOK_URL = 'http://n8n/webhook';
    const config = loadConfig();
    expect(config.port).toBe(3900);
    expect(config.calibrationDeadlineHour).toBe(12);
  });
});
