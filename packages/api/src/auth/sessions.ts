import { randomUUID } from 'node:crypto';
import type Database from 'better-sqlite3';

const SESSION_TTL_DAYS = 30;

/**
 * Creates a new session, persists it in the `sessions` table, and returns the
 * generated id. Caller writes the id into a cookie. Sessions expire after
 * SESSION_TTL_DAYS days from creation; activity does not extend.
 */
export function createSession(db: Database.Database): string {
  const id = randomUUID();
  db.prepare(
    `INSERT INTO sessions (id, expires_at)
     VALUES (?, datetime('now', '+${SESSION_TTL_DAYS} days'))`,
  ).run(id);
  return id;
}

/**
 * Returns true iff a non-expired session row matches `id`. Side effect: bumps
 * `last_used_at` so we can evict idle sessions later if we add a sweep job.
 */
export function validateSession(db: Database.Database, id: string): boolean {
  const row = db
    .prepare(
      `SELECT 1 FROM sessions
       WHERE id = ? AND expires_at > datetime('now')`,
    )
    .get(id);
  if (row) {
    db.prepare(`UPDATE sessions SET last_used_at = datetime('now') WHERE id = ?`).run(id);
    return true;
  }
  return false;
}

export function destroySession(db: Database.Database, id: string): void {
  db.prepare(`DELETE FROM sessions WHERE id = ?`).run(id);
}
