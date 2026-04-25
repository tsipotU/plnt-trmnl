import { Router, Request, Response } from 'express';
import { randomBytes } from 'node:crypto';
import type Database from 'better-sqlite3';
import { hashPassword, verifyPassword } from '../auth/passwords.js';
import { createSession, destroySession } from '../auth/sessions.js';

const MIN_PASSWORD_LENGTH = 12;

interface SessionCookieOptions {
  httpOnly: true;
  sameSite: 'strict';
  secure: boolean;
  maxAge: number;
  path: '/';
}

function sessionCookieOptions(req: Request): SessionCookieOptions {
  const secure = req.secure || req.headers['x-forwarded-proto'] === 'https';
  return {
    httpOnly: true,
    sameSite: 'strict',
    secure,
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    path: '/',
  };
}

export function createAuthRouter(db: Database.Database): Router {
  const router = Router();

  function getAdminHash(): string | null {
    const row = db
      .prepare(`SELECT value FROM app_state WHERE key = 'admin_password_hash'`)
      .get() as { value?: string } | undefined;
    return row?.value ?? null;
  }

  function getSetupToken(): string {
    const row = db
      .prepare(`SELECT value FROM app_state WHERE key = 'setup_token'`)
      .get() as { value?: string } | undefined;
    if (row?.value) return row.value;
    // Format: 3 groups of 4 hex characters separated by dashes (12 hex / 6 bytes)
    const token = randomBytes(6).toString('hex').toUpperCase().match(/.{4}/g)!.join('-');
    db.prepare(`INSERT INTO app_state (key, value) VALUES ('setup_token', ?)`).run(token);
    // eslint-disable-next-line no-console
    console.log(`[auth] No admin password set — setup token: ${token}`);
    // eslint-disable-next-line no-console
    console.log(`[auth] Visit / and enter this token to claim this instance.`);
    return token;
  }

  // GET /api/auth/setup-token — only when admin password not yet set
  router.get('/setup-token', (_req: Request, res: Response) => {
    if (getAdminHash()) {
      res.status(404).json({ error: 'Setup already complete' });
      return;
    }
    res.json({ token: getSetupToken() });
  });

  // POST /api/auth/setup — claim instance with the one-time token + chosen password
  router.post('/setup', async (req: Request, res: Response) => {
    if (getAdminHash()) {
      res.status(403).json({ error: 'Setup already complete' });
      return;
    }
    const { token, password } = (req.body ?? {}) as { token?: unknown; password?: unknown };
    const expected = getSetupToken();
    if (typeof token !== 'string' || token !== expected) {
      res.status(401).json({ error: 'Invalid setup token' });
      return;
    }
    if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
      res.status(400).json({ error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` });
      return;
    }
    const hash = await hashPassword(password);
    db.prepare(`INSERT INTO app_state (key, value) VALUES ('admin_password_hash', ?)`).run(hash);
    db.prepare(`DELETE FROM app_state WHERE key = 'setup_token'`).run();
    const session = createSession(db);
    res.cookie('session', session, sessionCookieOptions(req)).json({ ok: true });
  });

  // POST /api/auth/login
  router.post('/login', async (req: Request, res: Response) => {
    const hash = getAdminHash();
    if (!hash) {
      res.status(403).json({ error: 'Setup not complete' });
      return;
    }
    const { password } = (req.body ?? {}) as { password?: unknown };
    if (typeof password !== 'string') {
      res.status(400).json({ error: 'password required' });
      return;
    }
    const ok = await verifyPassword(password, hash);
    if (!ok) {
      res.status(401).json({ error: 'Incorrect password' });
      return;
    }
    const session = createSession(db);
    res.cookie('session', session, sessionCookieOptions(req)).json({ ok: true });
  });

  // POST /api/auth/logout
  router.post('/logout', (req: Request, res: Response) => {
    const session = (req.cookies as { session?: string } | undefined)?.session;
    if (session) destroySession(db, session);
    res.clearCookie('session', { path: '/' }).json({ ok: true });
  });

  // GET /api/auth/me — does the caller have a valid session?
  router.get('/me', (req: Request, res: Response) => {
    const session = (req.cookies as { session?: string } | undefined)?.session;
    if (!session) {
      res.status(401).json({ authenticated: false });
      return;
    }
    // Existence check; auth middleware does the validation when route protection runs.
    const row = db
      .prepare(`SELECT 1 FROM sessions WHERE id = ? AND expires_at > datetime('now')`)
      .get(session);
    if (row) {
      res.json({ authenticated: true });
    } else {
      res.status(401).json({ authenticated: false });
    }
  });

  return router;
}
