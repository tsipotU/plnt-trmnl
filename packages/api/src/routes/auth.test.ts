import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import Database from 'better-sqlite3';
import { initializeSchema } from '../database/schema.js';
import { createAuthRouter } from './auth.js';
import { hashPassword } from '../auth/passwords.js';

function makeApp() {
  const db = new Database(':memory:');
  initializeSchema(db);
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use('/api/auth', createAuthRouter(db));
  return { app, db };
}

async function seedPassword(db: Database.Database, password: string) {
  const hash = await hashPassword(password);
  db.prepare(`INSERT INTO app_state (key, value) VALUES ('admin_password_hash', ?)`).run(hash);
}

describe('GET /api/auth/setup-token', () => {
  it('returns a token when no admin password set', async () => {
    const { app } = makeApp();
    const res = await request(app).get('/api/auth/setup-token');
    expect(res.status).toBe(200);
    expect(res.body.token).toMatch(/^[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}$/);
  });

  it('returns the SAME token across calls until setup completes', async () => {
    const { app } = makeApp();
    const a = await request(app).get('/api/auth/setup-token');
    const b = await request(app).get('/api/auth/setup-token');
    expect(a.body.token).toBe(b.body.token);
  });

  it('returns 404 once admin password is set', async () => {
    const { app, db } = makeApp();
    await seedPassword(db, 'MyStrongP@ss12');
    const res = await request(app).get('/api/auth/setup-token');
    expect(res.status).toBe(404);
  });
});

describe('POST /api/auth/setup', () => {
  it('completes setup with the right token + sets cookie', async () => {
    const { app } = makeApp();
    const tokRes = await request(app).get('/api/auth/setup-token');
    const res = await request(app)
      .post('/api/auth/setup')
      .send({ token: tokRes.body.token, password: 'MyStrongP@ss12' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
    const setCookie = res.headers['set-cookie'];
    expect(setCookie).toBeDefined();
    expect(setCookie[0]).toMatch(/^session=/);
  });

  it('rejects wrong token', async () => {
    const { app } = makeApp();
    await request(app).get('/api/auth/setup-token'); // generate one
    const res = await request(app)
      .post('/api/auth/setup')
      .send({ token: 'AAAA-BBBB-CCCC', password: 'MyStrongP@ss12' });
    expect(res.status).toBe(401);
  });

  it('rejects passwords shorter than 12 chars', async () => {
    const { app } = makeApp();
    const tokRes = await request(app).get('/api/auth/setup-token');
    const res = await request(app)
      .post('/api/auth/setup')
      .send({ token: tokRes.body.token, password: 'short' });
    expect(res.status).toBe(400);
  });

  it('rejects setup when admin password already set', async () => {
    const { app, db } = makeApp();
    await seedPassword(db, 'MyStrongP@ss12');
    const res = await request(app)
      .post('/api/auth/setup')
      .send({ token: 'x', password: 'MyStrongP@ss12' });
    expect(res.status).toBe(403);
  });
});

describe('POST /api/auth/login', () => {
  it('returns 200 + session cookie for correct password', async () => {
    const { app, db } = makeApp();
    await seedPassword(db, 'MyStrongP@ss12');
    const res = await request(app).post('/api/auth/login').send({ password: 'MyStrongP@ss12' });
    expect(res.status).toBe(200);
    expect(res.headers['set-cookie'][0]).toMatch(/^session=/);
  });

  it('returns 401 for wrong password', async () => {
    const { app, db } = makeApp();
    await seedPassword(db, 'MyStrongP@ss12');
    const res = await request(app).post('/api/auth/login').send({ password: 'wrong' });
    expect(res.status).toBe(401);
  });

  it('returns 403 if setup not complete', async () => {
    const { app } = makeApp();
    const res = await request(app).post('/api/auth/login').send({ password: 'whatever' });
    expect(res.status).toBe(403);
  });
});

describe('GET /api/auth/me', () => {
  it('returns 401 with no cookie', async () => {
    const { app } = makeApp();
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ authenticated: false });
  });

  it('returns 200 after login', async () => {
    const { app, db } = makeApp();
    await seedPassword(db, 'MyStrongP@ss12');
    const login = await request(app).post('/api/auth/login').send({ password: 'MyStrongP@ss12' });
    const cookie = login.headers['set-cookie'][0];
    const res = await request(app).get('/api/auth/me').set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ authenticated: true });
  });

  it('returns 401 after logout', async () => {
    const { app, db } = makeApp();
    await seedPassword(db, 'MyStrongP@ss12');
    const login = await request(app).post('/api/auth/login').send({ password: 'MyStrongP@ss12' });
    const cookie = login.headers['set-cookie'][0];
    await request(app).post('/api/auth/logout').set('Cookie', cookie);
    const res = await request(app).get('/api/auth/me').set('Cookie', cookie);
    expect(res.status).toBe(401);
  });
});
