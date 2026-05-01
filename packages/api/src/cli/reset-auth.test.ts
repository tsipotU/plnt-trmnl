import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { initializeSchema } from '../database/schema.js';
import { hashPassword, verifyPassword } from '../auth/passwords.js';
import { resetAuth } from './reset-auth.js';

function makeDb(): Database.Database {
  const db = new Database(':memory:');
  initializeSchema(db);
  return db;
}

describe('resetAuth', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = makeDb();
  });

  it('inserts the admin_password_hash when no admin exists yet', async () => {
    const result = await resetAuth(db, 'new-strong-password');
    expect(result.passwordSet).toBe(true);
    const row = db
      .prepare(`SELECT value FROM app_state WHERE key = 'admin_password_hash'`)
      .get() as { value: string } | undefined;
    expect(row).toBeDefined();
    expect(await verifyPassword('new-strong-password', row!.value)).toBe(true);
  });

  it('replaces an existing admin_password_hash on rotation', async () => {
    const oldHash = await hashPassword('old-strong-password');
    db.prepare(`INSERT INTO app_state (key, value) VALUES ('admin_password_hash', ?)`).run(
      oldHash,
    );

    await resetAuth(db, 'new-strong-password');

    const row = db
      .prepare(`SELECT value FROM app_state WHERE key = 'admin_password_hash'`)
      .get() as { value: string };
    expect(await verifyPassword('old-strong-password', row.value)).toBe(false);
    expect(await verifyPassword('new-strong-password', row.value)).toBe(true);
  });

  it('deletes all existing sessions', async () => {
    db.prepare(
      `INSERT INTO sessions (id, expires_at) VALUES ('a', datetime('now', '+1 day')),
                                                    ('b', datetime('now', '+1 day')),
                                                    ('c', datetime('now', '+1 day'))`,
    ).run();
    expect((db.prepare(`SELECT COUNT(*) AS n FROM sessions`).get() as { n: number }).n).toBe(3);

    const result = await resetAuth(db, 'new-strong-password');

    expect(result.sessionsDeleted).toBe(3);
    expect((db.prepare(`SELECT COUNT(*) AS n FROM sessions`).get() as { n: number }).n).toBe(0);
  });

  it('rejects passwords shorter than 12 characters and does not touch the DB', async () => {
    const oldHash = await hashPassword('original-strong-password');
    db.prepare(`INSERT INTO app_state (key, value) VALUES ('admin_password_hash', ?)`).run(
      oldHash,
    );
    db.prepare(
      `INSERT INTO sessions (id, expires_at) VALUES ('survives', datetime('now', '+1 day'))`,
    ).run();

    await expect(resetAuth(db, 'short')).rejects.toThrow(/at least 12/);

    // Hash unchanged
    const row = db
      .prepare(`SELECT value FROM app_state WHERE key = 'admin_password_hash'`)
      .get() as { value: string };
    expect(row.value).toBe(oldHash);
    // Sessions unchanged
    expect((db.prepare(`SELECT COUNT(*) AS n FROM sessions`).get() as { n: number }).n).toBe(1);
  });

  it('returns 0 sessionsDeleted when there were no sessions to clear', async () => {
    const result = await resetAuth(db, 'new-strong-password');
    expect(result.sessionsDeleted).toBe(0);
  });
});
