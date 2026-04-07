import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { initializeSchema } from '../database/schema.js';
import { isVacationActive, startVacation, endVacation, getVacationStatus } from './vacation.js';

function createTestDb() {
  const db = new Database(':memory:');
  initializeSchema(db);
  return db;
}

describe('isVacationActive', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = createTestDb();
  });

  afterEach(() => {
    db.close();
  });

  it('returns false when no vacation is set', () => {
    expect(isVacationActive(db, '2026-04-07')).toBe(false);
  });

  it('returns true during vacation', () => {
    db.prepare(
      `INSERT OR REPLACE INTO app_state (key, value, updated_at) VALUES ('vacation_until', '2026-04-15', datetime('now'))`
    ).run();
    expect(isVacationActive(db, '2026-04-10')).toBe(true);
  });

  it('returns true on the last day of vacation', () => {
    db.prepare(
      `INSERT OR REPLACE INTO app_state (key, value, updated_at) VALUES ('vacation_until', '2026-04-15', datetime('now'))`
    ).run();
    expect(isVacationActive(db, '2026-04-15')).toBe(true);
  });

  it('returns false after vacation date has passed', () => {
    db.prepare(
      `INSERT OR REPLACE INTO app_state (key, value, updated_at) VALUES ('vacation_until', '2026-04-15', datetime('now'))`
    ).run();
    expect(isVacationActive(db, '2026-04-16')).toBe(false);
  });
});

describe('startVacation', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = createTestDb();
  });

  afterEach(() => {
    db.close();
  });

  it('stores the vacation_until date in app_state', () => {
    startVacation(db, '2026-04-20');
    const row = db.prepare(`SELECT value FROM app_state WHERE key = 'vacation_until'`).get() as
      | { value: string }
      | undefined;
    expect(row?.value).toBe('2026-04-20');
  });

  it('overwrites an existing vacation date', () => {
    startVacation(db, '2026-04-15');
    startVacation(db, '2026-04-25');
    const row = db.prepare(`SELECT value FROM app_state WHERE key = 'vacation_until'`).get() as
      | { value: string }
      | undefined;
    expect(row?.value).toBe('2026-04-25');
  });

  it('logs a vacation_start event', () => {
    startVacation(db, '2026-04-20');
    const events = db.prepare(
      `SELECT * FROM event_log WHERE event_type = 'vacation_start'`
    ).all();
    expect(events).toHaveLength(1);
  });
});

describe('endVacation', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = createTestDb();
    // Insert a few active plants
    db.prepare(
      `INSERT INTO plants (name, base_interval, current_interval, location, archived, next_water_date, last_watered_at)
       VALUES ('Monstera', 7, 7, 'living room', 0, '2026-04-01', '2026-03-25')`
    ).run();
    db.prepare(
      `INSERT INTO plants (name, base_interval, current_interval, location, archived, next_water_date, last_watered_at)
       VALUES ('Ficus', 5, 5, 'bedroom', 0, '2026-04-03', '2026-03-29')`
    ).run();
    db.prepare(
      `INSERT INTO plants (name, base_interval, current_interval, location, archived, next_water_date, last_watered_at)
       VALUES ('Archived Plant', 7, 7, 'office', 1, '2026-04-02', '2026-03-26')`
    ).run();
    // Set vacation
    startVacation(db, '2026-04-20');
  });

  afterEach(() => {
    db.close();
  });

  it('removes vacation_until from app_state', () => {
    endVacation(db, '2026-04-21');
    const row = db.prepare(`SELECT value FROM app_state WHERE key = 'vacation_until'`).get();
    expect(row).toBeUndefined();
  });

  it('recalculates all active plants next_water_date from today', () => {
    const today = '2026-04-21';
    endVacation(db, today);

    const plants = db.prepare(
      `SELECT * FROM plants WHERE archived = 0 ORDER BY id ASC`
    ).all() as Array<{ last_watered_at: string; next_water_date: string; current_interval: number }>;

    expect(plants).toHaveLength(2);

    for (const plant of plants) {
      expect(plant.last_watered_at).toBe(today);
      // next_water_date should be at least today + current_interval - 3 days (bin-packer can shift +-3)
      const nextDate = new Date(plant.next_water_date);
      const minDate = new Date(today);
      minDate.setUTCDate(minDate.getUTCDate() + plant.current_interval - 3);
      const maxDate = new Date(today);
      maxDate.setUTCDate(maxDate.getUTCDate() + plant.current_interval + 3);
      expect(nextDate.getTime()).toBeGreaterThanOrEqual(minDate.getTime());
      expect(nextDate.getTime()).toBeLessThanOrEqual(maxDate.getTime());
    }
  });

  it('does not modify archived plants', () => {
    const today = '2026-04-21';
    endVacation(db, today);

    const archived = db.prepare(
      `SELECT * FROM plants WHERE archived = 1`
    ).get() as { last_watered_at: string; next_water_date: string } | undefined;

    // Archived plant should remain unchanged
    expect(archived?.last_watered_at).toBe('2026-03-26');
    expect(archived?.next_water_date).toBe('2026-04-02');
  });

  it('respects bin-packing — no more than 2 plants per day', () => {
    // Add more plants to force bin-packing
    for (let i = 0; i < 4; i++) {
      db.prepare(
        `INSERT INTO plants (name, base_interval, current_interval, location, archived, next_water_date, last_watered_at)
         VALUES (?, 7, 7, 'kitchen', 0, '2026-04-05', '2026-03-29')`
      ).run(`Extra Plant ${i}`);
    }

    endVacation(db, '2026-04-21');

    const plants = db.prepare(
      `SELECT next_water_date FROM plants WHERE archived = 0`
    ).all() as Array<{ next_water_date: string }>;

    // Count plants per date
    const countByDate = new Map<string, number>();
    for (const plant of plants) {
      countByDate.set(
        plant.next_water_date,
        (countByDate.get(plant.next_water_date) ?? 0) + 1
      );
    }

    // No date should have more than 2 plants (bin-packer's MAX_PLANTS_PER_DAY = 2)
    for (const [date, count] of countByDate) {
      expect(count, `${count} plants on ${date}, expected <= 2`).toBeLessThanOrEqual(2);
    }
  });

  it('logs a vacation_end event', () => {
    endVacation(db, '2026-04-21');
    const events = db.prepare(
      `SELECT * FROM event_log WHERE event_type = 'vacation_end'`
    ).all();
    expect(events).toHaveLength(1);
  });
});

describe('getVacationStatus', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = createTestDb();
  });

  afterEach(() => {
    db.close();
  });

  it('returns active: false and until: null when no vacation is set', () => {
    const status = getVacationStatus(db);
    expect(status).toEqual({ active: false, until: null });
  });

  it('returns active: true and the until date during vacation', () => {
    db.prepare(
      `INSERT OR REPLACE INTO app_state (key, value, updated_at) VALUES ('vacation_until', '2026-04-20', datetime('now'))`
    ).run();
    const today = '2026-04-10';
    const status = getVacationStatus(db, today);
    expect(status).toEqual({ active: true, until: '2026-04-20' });
  });

  it('returns active: false but still returns until date when vacation has ended', () => {
    db.prepare(
      `INSERT OR REPLACE INTO app_state (key, value, updated_at) VALUES ('vacation_until', '2026-04-05', datetime('now'))`
    ).run();
    const today = '2026-04-10';
    const status = getVacationStatus(db, today);
    expect(status).toEqual({ active: false, until: '2026-04-05' });
  });
});
