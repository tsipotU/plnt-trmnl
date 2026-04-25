import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { initializeSchema } from './schema.js';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

describe('initializeSchema', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = new Database(':memory:');
  });

  afterEach(() => {
    db.close();
  });

  it('creates all required tables', () => {
    initializeSchema(db);
    const tables = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
    ).all() as { name: string }[];
    const names = tables.map(t => t.name);
    expect(names).toContain('plants');
    expect(names).toContain('calibration_questions');
    expect(names).toContain('calibrations');
    expect(names).toContain('plant_conditions');
    expect(names).toContain('facts');
    expect(names).toContain('decorative_ornaments');
    expect(names).toContain('event_log');
    expect(names).toContain('enrichment_queue');
    expect(names).toContain('app_state');
    expect(names).toContain('feedback_images');
    expect(names).toContain('sessions');
  });

  it('sessions table has the expected columns (#136)', () => {
    initializeSchema(db);
    const cols = db
      .prepare(`PRAGMA table_info(sessions)`)
      .all() as Array<{ name: string; type: string; notnull: number; pk: number }>;
    const names = cols.map((c) => c.name);
    expect(names).toContain('id');
    expect(names).toContain('created_at');
    expect(names).toContain('expires_at');
    expect(names).toContain('last_used_at');
    const pk = cols.find((c) => c.pk === 1);
    expect(pk?.name).toBe('id');
  });

  it('feedback_images cascades on feedback deletion', () => {
    initializeSchema(db);
    const fb = db.prepare(
      `INSERT INTO feedback (title, category) VALUES (?, ?)`
    ).run('Test', 'bug');
    const feedbackId = fb.lastInsertRowid as number;
    db.prepare(
      `INSERT INTO feedback_images (feedback_id, filename) VALUES (?, ?)`
    ).run(feedbackId, 'abc.png');

    db.prepare(`DELETE FROM feedback WHERE id = ?`).run(feedbackId);

    const imgs = db.prepare(
      `SELECT * FROM feedback_images WHERE feedback_id = ?`
    ).all(feedbackId);
    expect(imgs).toHaveLength(0);
  });

  it('is idempotent — can run twice without error', () => {
    initializeSchema(db);
    expect(() => initializeSchema(db)).not.toThrow();
  });

  it('plants table has identifier column (#2)', () => {
    initializeSchema(db);
    const cols = db
      .prepare(`PRAGMA table_info(plants)`)
      .all() as Array<{ name: string; type: string }>;
    const identifier = cols.find((c) => c.name === 'identifier');
    expect(identifier).toBeDefined();
    expect(identifier!.type.toUpperCase()).toBe('TEXT');
  });

  it('identifier column migration is idempotent on existing databases (#2)', () => {
    // Simulate a legacy DB created before the identifier column existed.
    db.prepare(
      `CREATE TABLE plants (
         id INTEGER PRIMARY KEY AUTOINCREMENT,
         name TEXT NOT NULL,
         archived INTEGER DEFAULT 0
       )`,
    ).run();
    db.prepare(`INSERT INTO plants (name) VALUES (?)`).run('Legacy plant');

    // First migration run — adds the column.
    initializeSchema(db);
    let cols = db.prepare(`PRAGMA table_info(plants)`).all() as Array<{ name: string }>;
    expect(cols.some((c) => c.name === 'identifier')).toBe(true);

    // Existing row preserved and identifier defaults to NULL.
    const existing = db.prepare(`SELECT name, identifier FROM plants WHERE id = 1`).get() as {
      name: string;
      identifier: string | null;
    };
    expect(existing.name).toBe('Legacy plant');
    expect(existing.identifier).toBeNull();

    // Second run — no-op, no throw, column still there.
    expect(() => initializeSchema(db)).not.toThrow();
    cols = db.prepare(`PRAGMA table_info(plants)`).all() as Array<{ name: string }>;
    expect(cols.filter((c) => c.name === 'identifier')).toHaveLength(1);
  });

  // WAL mode is not supported on :memory: databases (SQLite silently falls back
  // to 'memory' journal mode). Use a real file-backed DB for this assertion.
  it('enables WAL mode on file-backed database', () => {
    const dir = mkdtempSync(join(tmpdir(), 'plant-trmnl-test-'));
    const fileDb = new Database(join(dir, 'test.db'));
    try {
      initializeSchema(fileDb);
      const result = fileDb.pragma('journal_mode') as { journal_mode: string }[];
      expect(result[0].journal_mode).toBe('wal');
    } finally {
      fileDb.close();
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('adds care_update_status column to plant_conditions', () => {
    initializeSchema(db);
    const cols = db.prepare(`PRAGMA table_info(plant_conditions)`).all() as Array<{ name: string; dflt_value: string | null }>;
    const col = cols.find((c) => c.name === 'care_update_status');
    expect(col).toBeDefined();
    expect(col?.dflt_value).toMatch(/'not_needed'/);
  });

  it('care_update_status column migration is idempotent on existing databases', () => {
    // Simulate a legacy DB created before care_update_status existed.
    db.prepare(
      `CREATE TABLE plant_conditions (
         id INTEGER PRIMARY KEY AUTOINCREMENT,
         plant_id INTEGER NOT NULL,
         condition_name TEXT NOT NULL
       )`,
    ).run();

    // First migration run — adds the column.
    initializeSchema(db);
    let cols = db.prepare(`PRAGMA table_info(plant_conditions)`).all() as Array<{ name: string; dflt_value: string | null }>;
    const col = cols.find((c) => c.name === 'care_update_status');
    expect(col).toBeDefined();
    expect(col?.dflt_value).toMatch(/'not_needed'/);

    // Second run — no-op, no throw, column still there exactly once.
    expect(() => initializeSchema(db)).not.toThrow();
    cols = db.prepare(`PRAGMA table_info(plant_conditions)`).all() as Array<{ name: string; dflt_value: string | null }>;
    expect(cols.filter((c) => c.name === 'care_update_status')).toHaveLength(1);
  });
});
