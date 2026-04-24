import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { initializeSchema } from '../database/schema.js';
import { pickDailyFact, getTodayFact } from './pick-daily.js';

function insertPlant(
  db: Database.Database,
  overrides: Record<string, unknown> = {},
): number {
  const defaults = {
    name: 'Plant',
    species: 'Monstera deliciosa',
    archived: 0,
  };
  const fields = { ...defaults, ...overrides };
  const cols = Object.keys(fields).join(', ');
  const placeholders = Object.keys(fields).map(() => '?').join(', ');
  const res = db
    .prepare(`INSERT INTO plants (${cols}) VALUES (${placeholders})`)
    .run(...Object.values(fields));
  return res.lastInsertRowid as number;
}

function insertFact(
  db: Database.Database,
  opts: {
    text: string;
    source?: 'seed' | 'enrichment' | 'catalog';
    plantId?: number | null;
    species?: string | null;
    isDisabled?: 0 | 1;
    shownAt?: string | null;
    shownCount?: number;
  },
): number {
  const res = db
    .prepare(
      `INSERT INTO facts (plant_id, species, text, source, is_disabled, shown_at, shown_count)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      opts.plantId ?? null,
      opts.species ?? null,
      opts.text,
      opts.source ?? 'seed',
      opts.isDisabled ?? 0,
      opts.shownAt ?? null,
      opts.shownCount ?? 0,
    );
  return res.lastInsertRowid as number;
}

describe('pickDailyFact (#38)', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = new Database(':memory:');
    initializeSchema(db);
  });

  afterEach(() => {
    db.close();
  });

  it('returns null when there are no facts at all', () => {
    expect(pickDailyFact(db)).toBeNull();
  });

  it('returns null when all facts are disabled', () => {
    insertFact(db, { text: 'x', isDisabled: 1 });
    expect(pickDailyFact(db)).toBeNull();
  });

  it('skips facts whose plant is archived', () => {
    const live = insertPlant(db, { name: 'Live', archived: 0 });
    const dead = insertPlant(db, { name: 'Dead', archived: 1 });
    insertFact(db, { text: 'live fact', plantId: live, source: 'catalog' });
    insertFact(db, { text: 'dead fact', plantId: dead, source: 'catalog' });

    // Force plant bucket
    const chosen = pickDailyFact(db, { rand: () => 0.0 });
    expect(chosen).not.toBeNull();
    expect(chosen!.text).toBe('live fact');
  });

  it('prefers a never-shown fact over an already-shown one (plant bucket)', () => {
    const p = insertPlant(db);
    insertFact(db, {
      text: 'already shown',
      plantId: p,
      source: 'catalog',
      shownAt: '2026-04-01 00:00:00',
      shownCount: 3,
    });
    const unshownId = insertFact(db, {
      text: 'never shown',
      plantId: p,
      source: 'catalog',
    });

    const chosen = pickDailyFact(db, { rand: () => 0.0 });
    expect(chosen!.id).toBe(unshownId);
    expect(chosen!.text).toBe('never shown');
  });

  it('sets shown_at and increments shown_count on the chosen fact', () => {
    const p = insertPlant(db);
    const id = insertFact(db, { text: 'a fact', plantId: p, source: 'catalog' });

    const chosen = pickDailyFact(db, { rand: () => 0.0 });
    expect(chosen!.id).toBe(id);

    const row = db
      .prepare(`SELECT shown_at, shown_count FROM facts WHERE id = ?`)
      .get(id) as { shown_at: string | null; shown_count: number };
    expect(row.shown_at).not.toBeNull();
    expect(row.shown_count).toBe(1);
  });

  it('cycles: once all plant-bucket facts are shown, resets shown_at=NULL and picks again', () => {
    const p = insertPlant(db);
    const ids = [
      insertFact(db, {
        text: 'A',
        plantId: p,
        source: 'catalog',
        shownAt: '2026-04-01 00:00:00',
        shownCount: 1,
      }),
      insertFact(db, {
        text: 'B',
        plantId: p,
        source: 'catalog',
        shownAt: '2026-04-02 00:00:00',
        shownCount: 1,
      }),
      insertFact(db, {
        text: 'C',
        plantId: p,
        source: 'catalog',
        shownAt: '2026-04-03 00:00:00',
        shownCount: 1,
      }),
    ];

    // Force plant bucket so cycle logic runs on the seeded pool.
    const chosen = pickDailyFact(db, { rand: () => 0.0, plantWeight: 1.0 });
    expect(chosen).not.toBeNull();
    expect(ids).toContain(chosen!.id);

    // After the cycle reset + pick, exactly one fact should have shown_at set,
    // and the other two should be back to NULL (cycle just reset).
    const rows = db
      .prepare(`SELECT id, shown_at FROM facts ORDER BY id ASC`)
      .all() as Array<{ id: number; shown_at: string | null }>;
    const withShown = rows.filter((r) => r.shown_at != null);
    expect(withShown).toHaveLength(1);
    expect(withShown[0].id).toBe(chosen!.id);
  });

  it('picks from plant bucket when plantWeight = 1.0', () => {
    const p = insertPlant(db);
    insertFact(db, { text: 'plant fact', plantId: p, source: 'catalog' });
    insertFact(db, { text: 'generic fact', plantId: null, source: 'seed' });

    const chosen = pickDailyFact(db, { rand: () => 0.5, plantWeight: 1.0 });
    expect(chosen!.text).toBe('plant fact');
  });

  it('picks from generic bucket when plantWeight = 0', () => {
    const p = insertPlant(db);
    insertFact(db, { text: 'plant fact', plantId: p, source: 'catalog' });
    insertFact(db, { text: 'generic fact', plantId: null, source: 'seed' });

    const chosen = pickDailyFact(db, { rand: () => 0.5, plantWeight: 0 });
    expect(chosen!.text).toBe('generic fact');
  });

  it('falls back to generic bucket when plant bucket is empty even with plantWeight=1', () => {
    insertFact(db, { text: 'only generic', plantId: null, source: 'seed' });
    const chosen = pickDailyFact(db, { rand: () => 0.0, plantWeight: 1.0 });
    expect(chosen!.text).toBe('only generic');
  });

  it('persists today_fact in app_state and getTodayFact returns it', () => {
    const p = insertPlant(db);
    const id = insertFact(db, { text: 'today', plantId: p, source: 'catalog' });
    pickDailyFact(db, { rand: () => 0.0 });

    const today = getTodayFact(db);
    expect(today).not.toBeNull();
    expect(today!.id).toBe(id);
    expect(today!.text).toBe('today');
  });

  it('getTodayFact returns null when stored pick is from a different date', () => {
    const p = insertPlant(db);
    const id = insertFact(db, { text: 'old', plantId: p, source: 'catalog' });
    // Inject a stale record directly
    db.prepare(
      `INSERT INTO app_state (key, value) VALUES ('today_fact', ?)`,
    ).run(JSON.stringify({ id, date: '2020-01-01' }));

    expect(getTodayFact(db)).toBeNull();
  });

  it('getTodayFact returns null when referenced fact is disabled', () => {
    const p = insertPlant(db);
    const id = insertFact(db, { text: 'x', plantId: p, source: 'catalog' });
    pickDailyFact(db, { rand: () => 0.0 });
    db.prepare(`UPDATE facts SET is_disabled = 1 WHERE id = ?`).run(id);

    expect(getTodayFact(db)).toBeNull();
  });
});

describe('schema: facts.shown_at migration (#38)', () => {
  it('creates shown_at column on a fresh schema', () => {
    const db = new Database(':memory:');
    try {
      initializeSchema(db);
      const cols = db.prepare(`PRAGMA table_info(facts)`).all() as Array<{
        name: string;
      }>;
      expect(cols.some((c) => c.name === 'shown_at')).toBe(true);
    } finally {
      db.close();
    }
  });

  it('migration is idempotent — running twice does not error', () => {
    const db = new Database(':memory:');
    try {
      initializeSchema(db);
      expect(() => initializeSchema(db)).not.toThrow();
      const cols = db.prepare(`PRAGMA table_info(facts)`).all() as Array<{
        name: string;
      }>;
      expect(cols.filter((c) => c.name === 'shown_at')).toHaveLength(1);
    } finally {
      db.close();
    }
  });

  it('adds shown_at to a legacy facts table that lacked it', () => {
    const db = new Database(':memory:');
    try {
      // Legacy facts table — no shown_at, no species, old CHECK.
      db.prepare(
        `CREATE TABLE facts (
           id INTEGER PRIMARY KEY AUTOINCREMENT,
           plant_id INTEGER,
           text TEXT,
           source TEXT CHECK(source IN ('seed', 'enrichment')),
           shown_count INTEGER DEFAULT 0,
           is_disabled INTEGER DEFAULT 0,
           created_at TEXT DEFAULT (datetime('now'))
         )`,
      ).run();
      db.prepare(
        `INSERT INTO facts (text, source, shown_count) VALUES ('legacy', 'seed', 5)`,
      ).run();

      initializeSchema(db);

      const cols = db.prepare(`PRAGMA table_info(facts)`).all() as Array<{
        name: string;
      }>;
      expect(cols.some((c) => c.name === 'shown_at')).toBe(true);

      const existing = db
        .prepare(`SELECT text, shown_count, shown_at FROM facts WHERE id = 1`)
        .get() as { text: string; shown_count: number; shown_at: string | null };
      expect(existing.text).toBe('legacy');
      expect(existing.shown_count).toBe(5);
      expect(existing.shown_at).toBeNull();
    } finally {
      db.close();
    }
  });
});
