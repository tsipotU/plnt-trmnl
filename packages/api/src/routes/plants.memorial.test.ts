import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import Database from 'better-sqlite3';
import express from 'express';
import { initializeSchema } from '../database/schema.js';
import { createPlantsRouter } from './plants.js';

const HEATING_CONFIG = {
  heatingSeasonStart: { month: 10, day: 1 },
  heatingSeasonEnd: { month: 4, day: 30 },
} as never;

describe('GET /api/plants/:id/memorial', () => {
  let app: express.Express;
  let db: Database.Database;

  beforeEach(() => {
    db = new Database(':memory:');
    initializeSchema(db);
    app = express();
    app.use(express.json());
    app.use('/api/plants', createPlantsRouter(db, HEATING_CONFIG));
  });

  it('returns plant + lifetime stats for an archived plant', async () => {
    db.prepare(
      `INSERT INTO plants (id, name, species, base_interval, current_interval, archived, archived_at, archive_reason, archive_note, created_at, location, calibration_cycle)
       VALUES (1, 'Old Pothos', 'Pothos', 7, 7, 1, '2026-04-01 00:00:00', 'died', 'root rot', '2025-01-01 00:00:00', 'Living', 3)`
    ).run();
    db.prepare(
      `INSERT INTO event_log (plant_id, event_type, reason) VALUES
        (1, 'watered', 'a'),
        (1, 'watered', 'b'),
        (1, 'archived', 'died')`
    ).run();
    db.prepare(
      `INSERT INTO plants (name, base_interval, current_interval, mother_plant_id) VALUES
        ('Pup1', 7, 7, 1),
        ('Pup2', 7, 7, 1)`
    ).run();

    const res = await request(app).get('/api/plants/1/memorial').expect(200);
    expect(res.body.plant.id).toBe(1);
    expect(res.body.plant.name).toBe('Old Pothos');
    expect(res.body.plant.archived).toBe(1);
    expect(res.body.stats.waterings).toBe(2);
    expect(res.body.stats.offspring).toBe(2);
    expect(res.body.stats.calibration_cycles).toBe(3);
    expect(res.body.stats.lifespan_days).toBeGreaterThan(0);
    expect(res.body.stats.joined_at).toBe('2025-01-01 00:00:00');
    expect(res.body.stats.archived_at).toBe('2026-04-01 00:00:00');
  });

  it('returns 404 for unknown plant', async () => {
    await request(app).get('/api/plants/999/memorial').expect(404);
  });

  it('works for non-archived plant too (returns archived: 0, lifespan_days: 0)', async () => {
    db.prepare(
      `INSERT INTO plants (id, name, base_interval, current_interval, created_at) VALUES (5, 'Living', 7, 7, '2025-01-01 00:00:00')`
    ).run();
    const res = await request(app).get('/api/plants/5/memorial').expect(200);
    expect(res.body.plant.archived).toBe(0);
    expect(res.body.stats.lifespan_days).toBe(0);
    expect(res.body.stats.archived_at).toBeNull();
  });
});

describe('POST /api/plants/:id/restore', () => {
  let app: express.Express;
  let db: Database.Database;

  beforeEach(() => {
    db = new Database(':memory:');
    initializeSchema(db);
    app = express();
    app.use(express.json());
    app.use('/api/plants', createPlantsRouter(db, HEATING_CONFIG));
  });

  it('clears archived fields and logs restored event', async () => {
    db.prepare(
      `INSERT INTO plants (id, name, base_interval, current_interval, archived, archived_at, archive_reason, archive_note)
       VALUES (1, 'Restored', 7, 7, 1, '2026-04-01 00:00:00', 'died', 'oops')`
    ).run();

    const res = await request(app).post('/api/plants/1/restore').expect(200);
    expect(res.body.plant.archived).toBe(0);
    expect(res.body.plant.archived_at).toBeNull();
    expect(res.body.plant.archive_reason).toBeNull();
    expect(res.body.plant.archive_note).toBeNull();

    const events = db
      .prepare(`SELECT * FROM event_log WHERE plant_id = 1 AND event_type = 'restored'`)
      .all();
    expect(events).toHaveLength(1);
  });

  it('is idempotent on a non-archived plant', async () => {
    db.prepare(
      `INSERT INTO plants (id, name, base_interval, current_interval) VALUES (1, 'Already Live', 7, 7)`
    ).run();
    const res = await request(app).post('/api/plants/1/restore').expect(200);
    expect(res.body.plant.archived).toBe(0);
  });

  it('returns 404 for unknown plant', async () => {
    await request(app).post('/api/plants/999/restore').expect(404);
  });

  it('re-enables species facts that were soft-disabled at archive time', async () => {
    db.prepare(
      `INSERT INTO plants (id, name, species, base_interval, current_interval, archived, archived_at)
       VALUES (1, 'Dead Pothos', 'Pothos', 7, 7, 1, '2026-04-01 00:00:00')`
    ).run();
    db.prepare(
      `INSERT INTO facts (plant_id, species, text, source, is_disabled) VALUES (1, 'Pothos', 'Trails nicely', 'catalog', 1)`
    ).run();

    await request(app).post('/api/plants/1/restore').expect(200);

    const facts = db
      .prepare(`SELECT * FROM facts WHERE plant_id = 1 OR species = 'Pothos'`)
      .all() as { is_disabled: number }[];
    expect(facts.every((f) => f.is_disabled === 0)).toBe(true);
  });
});
