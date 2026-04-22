import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import Database from 'better-sqlite3';
import { initializeSchema } from '../database/schema.js';
import { createPlantsRouter } from './plants.js';

function createTestApp() {
  const db = new Database(':memory:');
  initializeSchema(db);
  const app = express();
  app.use(express.json());
  app.use('/api/plants', createPlantsRouter(db));
  return { app, db };
}

describe('GET /api/plants', () => {
  let app: express.Express;
  let db: Database.Database;

  beforeEach(() => {
    ({ app, db } = createTestApp());
  });

  afterEach(() => {
    db.close();
  });

  it('returns empty array when no plants exist', async () => {
    const res = await request(app).get('/api/plants');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('returns only non-archived plants', async () => {
    db.prepare(
      `INSERT INTO plants (name, base_interval, current_interval, archived, next_water_date)
       VALUES ('Active Plant', 7, 7, 0, '2026-04-10')`
    ).run();
    db.prepare(
      `INSERT INTO plants (name, base_interval, current_interval, archived, archived_at, next_water_date)
       VALUES ('Archived Plant', 7, 7, 1, datetime('now'), '2026-04-10')`
    ).run();

    const res = await request(app).get('/api/plants');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].name).toBe('Active Plant');
  });

  it('returns plants ordered by next_water_date ascending', async () => {
    db.prepare(
      `INSERT INTO plants (name, base_interval, current_interval, archived, next_water_date) VALUES ('Later', 7, 7, 0, '2026-04-20')`
    ).run();
    db.prepare(
      `INSERT INTO plants (name, base_interval, current_interval, archived, next_water_date) VALUES ('Sooner', 7, 7, 0, '2026-04-08')`
    ).run();

    const res = await request(app).get('/api/plants');
    expect(res.status).toBe(200);
    expect(res.body[0].name).toBe('Sooner');
    expect(res.body[1].name).toBe('Later');
  });
});

describe('POST /api/plants', () => {
  let app: express.Express;
  let db: Database.Database;

  beforeEach(() => {
    ({ app, db } = createTestApp());
  });

  afterEach(() => {
    db.close();
  });

  it('creates a plant and returns it with next_water_date set', async () => {
    const res = await request(app)
      .post('/api/plants')
      .send({
        name: 'Monstera',
        potSizeCm: 20,
        plantSize: 'large',
        location: 'Living room',
        lightLevel: 'bright_indirect',
        lastWateredAt: '2026-04-01',
      });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Monstera');
    expect(res.body.next_water_date).toBe('2026-04-08'); // 7 days default
    expect(res.body.enrichment_status).toBe('pending');
    expect(res.body.id).toBeTypeOf('number');
  });

  it('uses default interval of 7 when not provided', async () => {
    const res = await request(app)
      .post('/api/plants')
      .send({
        name: 'Fern',
        potSizeCm: 12,
        plantSize: 'small',
        location: 'Bathroom',
        lightLevel: 'low',
        lastWateredAt: '2026-04-01',
      });

    expect(res.status).toBe(201);
    expect(res.body.current_interval).toBe(7);
  });

  it('stores optional notes field', async () => {
    const res = await request(app)
      .post('/api/plants')
      .send({
        name: 'Cactus',
        potSizeCm: 8,
        plantSize: 'small',
        location: 'Windowsill',
        lightLevel: 'direct',
        lastWateredAt: '2026-04-01',
        notes: 'Very spiky',
      });

    expect(res.status).toBe(201);
    expect(res.body.notes).toBe('Very spiky');
  });

  it('returns 400 when required fields are missing', async () => {
    const res = await request(app)
      .post('/api/plants')
      .send({ name: 'Incomplete' });

    expect(res.status).toBe(400);
  });

  it('stores optional identifier field', async () => {
    const res = await request(app)
      .post('/api/plants')
      .send({
        name: 'Pothos',
        identifier: 'Hanging basket',
        lastWateredAt: '2026-04-01',
      });

    expect(res.status).toBe(201);
    expect(res.body.identifier).toBe('Hanging basket');
  });

  it('leaves identifier null when not provided', async () => {
    const res = await request(app)
      .post('/api/plants')
      .send({
        name: 'Monstera',
        lastWateredAt: '2026-04-01',
      });

    expect(res.status).toBe(201);
    expect(res.body.identifier).toBeNull();
  });
});

describe('GET /api/plants/:id', () => {
  let app: express.Express;
  let db: Database.Database;

  beforeEach(() => {
    ({ app, db } = createTestApp());
  });

  afterEach(() => {
    db.close();
  });

  it('returns the plant by id', async () => {
    const { lastInsertRowid } = db.prepare(
      `INSERT INTO plants (name, base_interval, current_interval, next_water_date) VALUES ('Rose', 5, 5, '2026-04-12')`
    ).run();

    const res = await request(app).get(`/api/plants/${lastInsertRowid}`);
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Rose');
    expect(res.body.id).toBe(Number(lastInsertRowid));
  });

  it('includes active_conditions_count', async () => {
    const { lastInsertRowid: plantId } = db.prepare(
      `INSERT INTO plants (name, base_interval, current_interval, next_water_date) VALUES ('Orchid', 5, 5, '2026-04-12')`
    ).run();
    db.prepare(
      `INSERT INTO plant_conditions (plant_id, condition_name, is_active) VALUES (?, 'Root rot', 1)`
    ).run(plantId);
    db.prepare(
      `INSERT INTO plant_conditions (plant_id, condition_name, is_active) VALUES (?, 'Yellow leaves', 1)`
    ).run(plantId);
    db.prepare(
      `INSERT INTO plant_conditions (plant_id, condition_name, is_active) VALUES (?, 'Old issue', 0)`
    ).run(plantId);

    const res = await request(app).get(`/api/plants/${plantId}`);
    expect(res.status).toBe(200);
    expect(res.body.active_conditions_count).toBe(2);
  });

  it('returns 404 for unknown plant', async () => {
    const res = await request(app).get('/api/plants/9999');
    expect(res.status).toBe(404);
  });
});

describe('PUT /api/plants/:id', () => {
  let app: express.Express;
  let db: Database.Database;

  beforeEach(() => {
    ({ app, db } = createTestApp());
  });

  afterEach(() => {
    db.close();
  });

  it('updates basic fields', async () => {
    const { lastInsertRowid } = db.prepare(
      `INSERT INTO plants (name, base_interval, current_interval, pot_size_cm, next_water_date) VALUES ('Basil', 7, 7, 10, '2026-04-08')`
    ).run();

    const res = await request(app)
      .put(`/api/plants/${lastInsertRowid}`)
      .send({ location: 'Kitchen', lightLevel: 'bright_indirect' });

    expect(res.status).toBe(200);
    expect(res.body.location).toBe('Kitchen');
    expect(res.body.light_level).toBe('bright_indirect');
  });

  it('returns 404 for unknown plant', async () => {
    const res = await request(app)
      .put('/api/plants/9999')
      .send({ location: 'Nowhere' });

    expect(res.status).toBe(404);
  });

  it('recalculates interval and resets is_converged on pot size change', async () => {
    const { lastInsertRowid } = db.prepare(
      `INSERT INTO plants (name, base_interval, current_interval, pot_size_cm, next_water_date, last_watered_at, is_converged)
       VALUES ('Pothos', 7, 7, 15, '2026-04-08', '2026-04-01', 1)`
    ).run();

    const res = await request(app)
      .put(`/api/plants/${lastInsertRowid}`)
      .send({ potSizeCm: 25 }); // larger pot — interval should increase

    expect(res.status).toBe(200);
    expect(res.body.is_converged).toBe(0);
    // pot grew: expect interval > 7
    expect(res.body.current_interval).toBeGreaterThan(7);
    // next_water_date should be recalculated
    expect(res.body.next_water_date).toBeDefined();
  });

  it('updates identifier when provided', async () => {
    const { lastInsertRowid } = db.prepare(
      `INSERT INTO plants (name, base_interval, current_interval, next_water_date, identifier)
       VALUES ('Pothos', 7, 7, '2026-04-08', 'Blue pot')`
    ).run();

    const res = await request(app)
      .put(`/api/plants/${lastInsertRowid}`)
      .send({ identifier: 'Terracotta pot' });

    expect(res.status).toBe(200);
    expect(res.body.identifier).toBe('Terracotta pot');
  });

  it('clears identifier when explicitly set to null', async () => {
    const { lastInsertRowid } = db.prepare(
      `INSERT INTO plants (name, base_interval, current_interval, next_water_date, identifier)
       VALUES ('Pothos', 7, 7, '2026-04-08', 'Old label')`
    ).run();

    const res = await request(app)
      .put(`/api/plants/${lastInsertRowid}`)
      .send({ identifier: null });

    expect(res.status).toBe(200);
    expect(res.body.identifier).toBeNull();
  });

  it('preserves identifier when the field is omitted from the update', async () => {
    const { lastInsertRowid } = db.prepare(
      `INSERT INTO plants (name, base_interval, current_interval, next_water_date, identifier)
       VALUES ('Pothos', 7, 7, '2026-04-08', 'Kitchen shelf')`
    ).run();

    const res = await request(app)
      .put(`/api/plants/${lastInsertRowid}`)
      .send({ location: 'Moved to bedroom' });

    expect(res.status).toBe(200);
    expect(res.body.identifier).toBe('Kitchen shelf');
    expect(res.body.location).toBe('Moved to bedroom');
  });

  it('logs a repot event when pot size changes', async () => {
    const { lastInsertRowid: plantId } = db.prepare(
      `INSERT INTO plants (name, base_interval, current_interval, pot_size_cm, next_water_date, last_watered_at)
       VALUES ('Ficus', 7, 7, 15, '2026-04-08', '2026-04-01')`
    ).run();

    await request(app)
      .put(`/api/plants/${plantId}`)
      .send({ potSizeCm: 25 });

    const events = db.prepare(
      `SELECT * FROM event_log WHERE plant_id = ? AND event_type = 'repot'`
    ).all(plantId);

    expect(events).toHaveLength(1);
  });
});

describe('POST /api/plants/:id/water', () => {
  let app: express.Express;
  let db: Database.Database;

  beforeEach(() => {
    ({ app, db } = createTestApp());
  });

  afterEach(() => {
    db.close();
  });

  it('sets last_watered_at to today and recalculates next_water_date', async () => {
    const { lastInsertRowid } = db.prepare(
      `INSERT INTO plants (name, base_interval, current_interval, next_water_date, last_watered_at)
       VALUES ('Spider Plant', 7, 7, '2026-04-01', '2026-03-25')`
    ).run();

    const res = await request(app).post(`/api/plants/${lastInsertRowid}/water`);

    expect(res.status).toBe(200);
    const today = new Date().toISOString().split('T')[0];
    expect(res.body.last_watered_at).toBe(today);

    // next_water_date = today + 7 days
    const expected = new Date();
    expected.setUTCDate(expected.getUTCDate() + 7);
    const expectedDate = expected.toISOString().split('T')[0];
    expect(res.body.next_water_date).toBe(expectedDate);
  });

  it('increments calibration_cycle', async () => {
    const { lastInsertRowid } = db.prepare(
      `INSERT INTO plants (name, base_interval, current_interval, next_water_date, calibration_cycle)
       VALUES ('Peace Lily', 5, 5, '2026-04-06', 3)`
    ).run();

    const res = await request(app).post(`/api/plants/${lastInsertRowid}/water`);

    expect(res.status).toBe(200);
    expect(res.body.calibration_cycle).toBe(4);
  });

  it('logs a watered event', async () => {
    const { lastInsertRowid: plantId } = db.prepare(
      `INSERT INTO plants (name, base_interval, current_interval, next_water_date)
       VALUES ('Aloe', 14, 14, '2026-04-07')`
    ).run();

    await request(app).post(`/api/plants/${plantId}/water`);

    const events = db.prepare(
      `SELECT * FROM event_log WHERE plant_id = ? AND event_type = 'watered'`
    ).all(plantId);

    expect(events).toHaveLength(1);
  });

  it('returns 404 for unknown plant', async () => {
    const res = await request(app).post('/api/plants/9999/water');
    expect(res.status).toBe(404);
  });
});

describe('POST /api/plants/:id/archive', () => {
  let app: express.Express;
  let db: Database.Database;

  beforeEach(() => {
    ({ app, db } = createTestApp());
  });

  afterEach(() => {
    db.close();
  });

  it('sets archived = 1 and archived_at', async () => {
    const { lastInsertRowid } = db.prepare(
      `INSERT INTO plants (name, base_interval, current_interval, next_water_date)
       VALUES ('Tulip', 7, 7, '2026-04-10')`
    ).run();

    const res = await request(app).post(`/api/plants/${lastInsertRowid}/archive`);

    expect(res.status).toBe(200);
    expect(res.body.archived).toBe(1);
    expect(res.body.archived_at).toBeDefined();
  });

  it('archived plant does not appear in GET /api/plants', async () => {
    const { lastInsertRowid } = db.prepare(
      `INSERT INTO plants (name, base_interval, current_interval, next_water_date)
       VALUES ('Daisy', 7, 7, '2026-04-10')`
    ).run();

    await request(app).post(`/api/plants/${lastInsertRowid}/archive`);

    const res = await request(app).get('/api/plants');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(0);
  });

  it('logs an archived event', async () => {
    const { lastInsertRowid: plantId } = db.prepare(
      `INSERT INTO plants (name, base_interval, current_interval, next_water_date)
       VALUES ('Lily', 7, 7, '2026-04-10')`
    ).run();

    await request(app).post(`/api/plants/${plantId}/archive`);

    const events = db.prepare(
      `SELECT * FROM event_log WHERE plant_id = ? AND event_type = 'archived'`
    ).all(plantId);

    expect(events).toHaveLength(1);
  });

  it('returns 404 for unknown plant', async () => {
    const res = await request(app).post('/api/plants/9999/archive');
    expect(res.status).toBe(404);
  });
});
