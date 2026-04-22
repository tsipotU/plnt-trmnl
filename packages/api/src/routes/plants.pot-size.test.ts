import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import Database from 'better-sqlite3';
import express from 'express';
import { initializeSchema } from '../database/schema.js';
import { createPlantsRouter } from './plants.js';

describe('pot size (#31)', () => {
  let app: express.Express;
  let db: Database.Database;

  beforeEach(() => {
    db = new Database(':memory:');
    initializeSchema(db);
    app = express();
    app.use(express.json());
    app.use('/api/plants', createPlantsRouter(db));
  });

  it('stores and returns pot_size_category + pot_size_cm on POST', async () => {
    const created = await request(app)
      .post('/api/plants')
      .send({
        name: 'Monstera',
        lastWateredAt: '2026-04-01',
        pot_size_category: 'Medium',
        pot_size_cm: 18,
      })
      .expect(201);

    expect(created.body.pot_size_category).toBe('Medium');
    expect(created.body.pot_size_cm).toBe(18);
  });

  it('stores Other with custom numeric size', async () => {
    const created = await request(app)
      .post('/api/plants')
      .send({
        name: 'Big Boy',
        lastWateredAt: '2026-04-01',
        pot_size_category: 'Other',
        pot_size_cm: 35,
      })
      .expect(201);

    expect(created.body.pot_size_category).toBe('Other');
    expect(created.body.pot_size_cm).toBe(35);
  });

  it('rejects invalid category', async () => {
    await request(app)
      .post('/api/plants')
      .send({
        name: 'Bad',
        lastWateredAt: '2026-04-01',
        pot_size_category: 'Enormous',
        pot_size_cm: 100,
      })
      .expect(400);
  });

  it('updates via PUT (preserves values when omitted)', async () => {
    const created = await request(app)
      .post('/api/plants')
      .send({
        name: 'Pothos',
        lastWateredAt: '2026-04-01',
        pot_size_category: 'Small',
        pot_size_cm: 13,
      })
      .expect(201);

    const updated = await request(app)
      .put(`/api/plants/${created.body.id}`)
      .send({ name: 'Pothos Renamed' })
      .expect(200);

    expect(updated.body.pot_size_category).toBe('Small');
    expect(updated.body.pot_size_cm).toBe(13);
  });
});
