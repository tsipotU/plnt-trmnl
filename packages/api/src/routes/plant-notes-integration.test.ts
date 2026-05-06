/**
 * Note POST through the full /api/plants stack. Production mounts both
 * plants router and plant-notes router at /api/plants; the isolated
 * plant-notes.test.ts only mounts plant-notes, so a routing collision
 * between the two would slip through there. This guards the production
 * wiring directly.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import Database from 'better-sqlite3';
import { initializeSchema } from '../database/schema.js';
import { createPlantsRouter } from './plants.js';
import { createPlantNotesRouter } from './plant-notes.js';

function buildApp() {
  const db = new Database(':memory:');
  initializeSchema(db);
  const app = express();
  app.use(express.json());
  // Production order: plants first, plant-notes second, both at /api/plants.
  // Routes/config don't matter for this routing-collision test — pass nothing
  // and let createPlantsRouter use its defaults.
  app.use('/api/plants', createPlantsRouter(db));
  app.use('/api/plants', createPlantNotesRouter(db));

  const { lastInsertRowid } = db
    .prepare(
      `INSERT INTO plants (name, base_interval, current_interval, next_water_date)
       VALUES ('Monstera', 7, 7, '2026-04-08')`,
    )
    .run();

  return { app, db, plantId: Number(lastInsertRowid) };
}

describe('POST /api/plants/:plantId/notes through full stack', () => {
  let app: express.Express;
  let db: Database.Database;
  let plantId: number;

  beforeEach(() => {
    ({ app, db, plantId } = buildApp());
  });

  afterEach(() => {
    db.close();
  });

  it('persists a note when posted through the production-mounted stack', async () => {
    const res = await request(app)
      .post(`/api/plants/${plantId}/notes`)
      .send({ body: 'Leaves looking droopy' });

    // If 404/405/anything-not-201, plants router is intercepting.
    expect(res.status).toBe(201);
    expect(res.body.body).toBe('Leaves looking droopy');

    const row = db
      .prepare(`SELECT body FROM plant_notes WHERE plant_id = ?`)
      .get(plantId) as { body: string } | undefined;
    expect(row?.body).toBe('Leaves looking droopy');
  });
});
