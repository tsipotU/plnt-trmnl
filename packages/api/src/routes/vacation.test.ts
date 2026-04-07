import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import Database from 'better-sqlite3';
import { initializeSchema } from '../database/schema.js';
import { createVacationRouter } from './vacation.js';

function createTestApp() {
  const db = new Database(':memory:');
  initializeSchema(db);
  const app = express();
  app.use(express.json());
  app.use('/api/vacation', createVacationRouter(db));
  return { app, db };
}

describe('GET /api/vacation', () => {
  let app: express.Express;
  let db: Database.Database;

  beforeEach(() => {
    ({ app, db } = createTestApp());
  });

  afterEach(() => {
    db.close();
  });

  it('returns inactive when no vacation is set', async () => {
    const res = await request(app).get('/api/vacation');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ active: false, until: null });
  });

  it('returns active status when vacation is set', async () => {
    db.prepare(
      `INSERT OR REPLACE INTO app_state (key, value, updated_at) VALUES ('vacation_until', '2026-12-31', datetime('now'))`
    ).run();
    const res = await request(app).get('/api/vacation');
    expect(res.status).toBe(200);
    expect(res.body.until).toBe('2026-12-31');
    expect(res.body.active).toBe(true);
  });
});

describe('POST /api/vacation', () => {
  let app: express.Express;
  let db: Database.Database;

  beforeEach(() => {
    ({ app, db } = createTestApp());
  });

  afterEach(() => {
    db.close();
  });

  it('sets vacation and returns active status', async () => {
    const res = await request(app)
      .post('/api/vacation')
      .send({ until: '2026-12-31' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ active: true, until: '2026-12-31' });
  });

  it('stores vacation_until in app_state', async () => {
    await request(app)
      .post('/api/vacation')
      .send({ until: '2026-12-31' });

    const row = db.prepare(`SELECT value FROM app_state WHERE key = 'vacation_until'`).get() as
      | { value: string }
      | undefined;
    expect(row?.value).toBe('2026-12-31');
  });

  it('returns 400 when until is missing', async () => {
    const res = await request(app)
      .post('/api/vacation')
      .send({});

    expect(res.status).toBe(400);
  });

  it('returns 400 when until is a past date', async () => {
    const res = await request(app)
      .post('/api/vacation')
      .send({ until: '2020-01-01' });

    expect(res.status).toBe(400);
  });

  it('returns 400 when until is today', async () => {
    const today = new Date().toISOString().split('T')[0];
    const res = await request(app)
      .post('/api/vacation')
      .send({ until: today });

    expect(res.status).toBe(400);
  });

  it('returns 400 when until is not a valid date string', async () => {
    const res = await request(app)
      .post('/api/vacation')
      .send({ until: 'not-a-date' });

    expect(res.status).toBe(400);
  });
});

describe('DELETE /api/vacation', () => {
  let app: express.Express;
  let db: Database.Database;

  beforeEach(() => {
    ({ app, db } = createTestApp());
    // Set vacation and add active plants
    db.prepare(
      `INSERT OR REPLACE INTO app_state (key, value, updated_at) VALUES ('vacation_until', '2026-12-31', datetime('now'))`
    ).run();
    db.prepare(
      `INSERT INTO plants (name, base_interval, current_interval, location, archived, next_water_date, last_watered_at)
       VALUES ('Monstera', 7, 7, 'living room', 0, '2026-04-01', '2026-03-25')`
    ).run();
    db.prepare(
      `INSERT INTO plants (name, base_interval, current_interval, location, archived, next_water_date, last_watered_at)
       VALUES ('Fern', 5, 5, 'bathroom', 0, '2026-04-02', '2026-03-28')`
    ).run();
  });

  afterEach(() => {
    db.close();
  });

  it('ends vacation and returns active: false with recalculated: true', async () => {
    const res = await request(app).delete('/api/vacation');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ active: false, recalculated: true });
  });

  it('removes vacation_until from app_state', async () => {
    await request(app).delete('/api/vacation');
    const row = db.prepare(`SELECT value FROM app_state WHERE key = 'vacation_until'`).get();
    expect(row).toBeUndefined();
  });

  it('recalculates plant schedules from today', async () => {
    await request(app).delete('/api/vacation');

    const today = new Date().toISOString().split('T')[0];
    const plants = db.prepare(
      `SELECT last_watered_at, next_water_date, current_interval FROM plants WHERE archived = 0`
    ).all() as Array<{ last_watered_at: string; next_water_date: string; current_interval: number }>;

    for (const plant of plants) {
      expect(plant.last_watered_at).toBe(today);
    }
  });

  it('returns 404 when no vacation is active', async () => {
    db.prepare(`DELETE FROM app_state WHERE key = 'vacation_until'`).run();
    const res = await request(app).delete('/api/vacation');
    expect(res.status).toBe(404);
  });
});
