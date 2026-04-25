import type { Request, Response, NextFunction } from 'express';
import type Database from 'better-sqlite3';
import { validateSession } from './sessions.js';

/**
 * Path prefixes that bypass auth even after the admin password is set.
 *
 * - `/health` — Docker / orchestrator health probes must work without a session.
 * - `/api/auth/` — login, logout, setup-token, setup, me. Auth itself can't
 *   require auth; the gate would be unreachable.
 * - `/api/feedback` — STOP-GAP. The in-app feedback module is currently
 *   unauthenticated by design (community can drop feedback without an account).
 *   Revisit this once the in-app form gets its own light auth.
 */
const PUBLIC_PREFIXES = ['/health', '/api/auth/', '/api/feedback'];

/**
 * `requireAuth` is the global gate for everything under `/api/*` (mount it
 * after `/api/auth` is registered). Returns 401 with `{ error }` if no valid
 * session cookie. Lets traffic through unconditionally before initial setup
 * (no admin password row in `app_state` yet) so the bootstrap UI is reachable.
 */
export function requireAuth(db: Database.Database) {
  return function (req: Request, res: Response, next: NextFunction): void {
    if (PUBLIC_PREFIXES.some((p) => req.path.startsWith(p))) {
      next();
      return;
    }

    // Bootstrap mode — no admin password yet. Let everything through; setup
    // endpoints handle the gate.
    const hashRow = db
      .prepare(`SELECT 1 FROM app_state WHERE key = 'admin_password_hash'`)
      .get();
    if (!hashRow) {
      next();
      return;
    }

    const sessionId = (req.cookies as { session?: string } | undefined)?.session;
    if (!sessionId || !validateSession(db, sessionId)) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    next();
  };
}
