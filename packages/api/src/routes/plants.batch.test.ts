import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import Database from 'better-sqlite3';
import express from 'express';
import { initializeSchema } from '../database/schema.js';
import { createPlantsRouter } from './plants.js';

describe('batch water (#11)', () => {
  let app: express.Express;
  let db: Database.Database;
  const today = new Date().toISOString().slice(0, 10);

  beforeEach(() => {
    db = new Database(':memory:');
    initializeSchema(db);
    app = express();
    app.use(express.json());
    app.use('/api/plants', createPlantsRouter(db));

    // Seed 3 plants due today, location=Living, interval=7, last_watered=7 days ago
    const ago = new Date(Date.now() - 7 * 86400_000).toISOString().slice(0, 10);
    const insert = db.prepare(
      `INSERT INTO plants (name, base_interval, current_interval, last_watered_at, next_water_date, location)
       VALUES (?, 7, 7, ?, ?, 'Living')`
    );
    insert.run('A', ago, today);
    insert.run('B', ago, today);
    insert.run('C', ago, today);
  });

  it('POST /water-all waters all due plants with shared batch_id', async () => {
    const res = await request(app).post('/api/plants/water-all').send({}).expect(200);
    expect(res.body.watered).toHaveLength(3);
    expect(res.body.batch_id).toMatch(/^[0-9a-f-]+$/i);

    const events = db.prepare(
      "SELECT DISTINCT batch_id FROM event_log WHERE event_type = 'watered'"
    ).all();
    expect(events).toHaveLength(1); // one batch_id across all 3 watered events
  });

  it('POST /water-all respects plant_ids filter', async () => {
    const res = await request(app).post('/api/plants/water-all').send({ plant_ids: [1, 2] }).expect(200);
    expect(res.body.watered).toHaveLength(2);
  });

  it('POST /undo-batch restores all plants + deletes events', async () => {
    const waterRes = await request(app).post('/api/plants/water-all').send({}).expect(200);
    const batchId = waterRes.body.batch_id;

    await request(app).post('/api/plants/undo-batch').send({ batch_id: batchId }).expect(200);

    const events = db.prepare(
      "SELECT * FROM event_log WHERE batch_id = ?"
    ).all(batchId);
    expect(events).toHaveLength(0);

    const ago = new Date(Date.now() - 7 * 86400_000).toISOString().slice(0, 10);
    const plants = db.prepare("SELECT last_watered_at FROM plants").all() as any[];
    expect(plants.every(p => p.last_watered_at === ago)).toBe(true);
  });
});
