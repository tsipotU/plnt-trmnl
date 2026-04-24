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
});
