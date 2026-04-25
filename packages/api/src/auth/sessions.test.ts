import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { initializeSchema } from '../database/schema.js';
import { createSession, validateSession, destroySession } from './sessions.js';

describe('sessions', () => {
  let db: Database.Database;
  beforeEach(() => {
    db = new Database(':memory:');
    initializeSchema(db);
  });

  it('createSession returns a UUID-shaped id and persists a row', () => {
    const id = createSession(db);
    expect(id).toMatch(/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/);
    const row = db.prepare(`SELECT id FROM sessions WHERE id = ?`).get(id);
    expect(row).toBeDefined();
  });

  it('createSession produces unique ids', () => {
    expect(createSession(db)).not.toBe(createSession(db));
  });

  it('validateSession returns true for a fresh session', () => {
    const id = createSession(db);
    expect(validateSession(db, id)).toBe(true);
  });

  it('validateSession returns false for an unknown id', () => {
    expect(validateSession(db, 'no-such-session')).toBe(false);
  });

  it('validateSession returns false for an expired session', () => {
    db.prepare(
      `INSERT INTO sessions (id, expires_at, last_used_at)
       VALUES (?, datetime('now', '-1 day'), datetime('now'))`,
    ).run('expired');
    expect(validateSession(db, 'expired')).toBe(false);
  });

  it('destroySession removes the row and subsequent validate is false', () => {
    const id = createSession(db);
    destroySession(db, id);
    expect(validateSession(db, id)).toBe(false);
  });

  it('destroySession on unknown id is a no-op (idempotent)', () => {
    expect(() => destroySession(db, 'nope')).not.toThrow();
  });
});
