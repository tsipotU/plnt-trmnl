import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import Database from 'better-sqlite3';
import { initializeSchema } from '../database/schema.js';
import { createAuthRouter } from '../routes/auth.js';
import { requireAuth } from './middleware.js';
import { hashPassword } from './passwords.js';

function makeApp(opts: { withAdmin?: boolean } = {}) {
  const db = new Database(':memory:');
  initializeSchema(db);
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.get('/health', (_req, res) => res.json({ ok: true }));
  app.use('/api/auth', createAuthRouter(db));
  app.use(requireAuth(db));
  // Stand-in protected route
  app.get('/api/plants', (_req, res) => res.json([{ id: 1, name: 'Pothos' }]));
  // Public-prefix route under /api/feedback
  app.get('/api/feedback', (_req, res) => res.json([]));
  // Stand-in non-/api routes (SPA HTML / static assets) — must always pass
  app.get('/', (_req, res) => res.send('<html>spa</html>'));
  app.get('/login', (_req, res) => res.send('<html>login</html>'));
  app.get('/welcome', (_req, res) => res.send('<html>welcome</html>'));

  if (opts.withAdmin) {
    return Promise.resolve()
      .then(() => hashPassword('MyStrongP@ss12'))
      .then((hash) => {
        db.prepare(`INSERT INTO app_state (key, value) VALUES ('admin_password_hash', ?)`).run(hash);
        return { app, db };
      });
  }
  return Promise.resolve({ app, db });
}

describe('requireAuth middleware', () => {
  it('lets all traffic through in bootstrap mode (no admin password)', async () => {
    const { app } = await makeApp();
    const res = await request(app).get('/api/plants');
    expect(res.status).toBe(200);
  });

  it('returns 401 for protected route without session when admin set', async () => {
    const { app } = await makeApp({ withAdmin: true });
    const res = await request(app).get('/api/plants');
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'Authentication required' });
  });

  it('lets traffic through with valid session cookie', async () => {
    const { app } = await makeApp({ withAdmin: true });
    const login = await request(app).post('/api/auth/login').send({ password: 'MyStrongP@ss12' });
    const cookie = login.headers['set-cookie'][0];
    const res = await request(app).get('/api/plants').set('Cookie', cookie);
    expect(res.status).toBe(200);
  });

  it('always lets /health through', async () => {
    const { app } = await makeApp({ withAdmin: true });
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
  });

  it('always lets /api/auth/* through', async () => {
    const { app } = await makeApp({ withAdmin: true });
    const res = await request(app).get('/api/auth/me');
    // /me with no cookie returns 401 from the route itself, not from middleware —
    // the point is that middleware did not block it before the route ran.
    expect([200, 401]).toContain(res.status);
    expect(res.body.error).not.toBe('Authentication required');
  });

  it('always lets /api/feedback through (stop-gap, see middleware.ts)', async () => {
    const { app } = await makeApp({ withAdmin: true });
    const res = await request(app).get('/api/feedback');
    expect(res.status).toBe(200);
  });

  it('always lets the SPA root through (fresh device must reach login form)', async () => {
    const { app } = await makeApp({ withAdmin: true });
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.text).toContain('spa');
  });

  it('always lets /login through (no session yet on a fresh device)', async () => {
    const { app } = await makeApp({ withAdmin: true });
    const res = await request(app).get('/login');
    expect(res.status).toBe(200);
    expect(res.text).toContain('login');
  });

  it('always lets /welcome through (bootstrap claim flow)', async () => {
    const { app } = await makeApp({ withAdmin: true });
    const res = await request(app).get('/welcome');
    expect(res.status).toBe(200);
    expect(res.text).toContain('welcome');
  });

  it('rejects expired session cookie', async () => {
    const { app, db } = await makeApp({ withAdmin: true });
    db.prepare(
      `INSERT INTO sessions (id, expires_at, last_used_at)
       VALUES (?, datetime('now', '-1 day'), datetime('now'))`,
    ).run('expired');
    const res = await request(app)
      .get('/api/plants')
      .set('Cookie', 'session=expired');
    expect(res.status).toBe(401);
  });

  it('rejects unknown session cookie', async () => {
    const { app } = await makeApp({ withAdmin: true });
    const res = await request(app)
      .get('/api/plants')
      .set('Cookie', 'session=does-not-exist');
    expect(res.status).toBe(401);
  });
});
