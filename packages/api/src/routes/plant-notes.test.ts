import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import Database from 'better-sqlite3';
import { initializeSchema } from '../database/schema.js';
import { createPlantNotesRouter } from './plant-notes.js';

function createTestApp() {
  const db = new Database(':memory:');
  initializeSchema(db);
  const app = express();
  app.use(express.json());
  app.use('/api/plants', createPlantNotesRouter(db));

  // Seed a plant so routes under /:plantId have a valid target.
  const { lastInsertRowid } = db
    .prepare(
      `INSERT INTO plants (name, base_interval, current_interval, next_water_date)
       VALUES ('Monstera', 7, 7, '2026-04-08')`,
    )
    .run();

  return { app, db, plantId: Number(lastInsertRowid) };
}

describe('GET /api/plants/:plantId/notes', () => {
  let app: express.Express;
  let db: Database.Database;
  let plantId: number;

  beforeEach(() => {
    ({ app, db, plantId } = createTestApp());
  });

  afterEach(() => {
    db.close();
  });

  it('returns an empty array when no notes exist', async () => {
    const res = await request(app).get(`/api/plants/${plantId}/notes`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('returns notes newest-first', async () => {
    db.prepare(
      `INSERT INTO plant_notes (plant_id, body, created_at) VALUES (?, 'old', '2026-04-01T10:00:00Z')`,
    ).run(plantId);
    db.prepare(
      `INSERT INTO plant_notes (plant_id, body, created_at) VALUES (?, 'new', '2026-04-20T10:00:00Z')`,
    ).run(plantId);

    const res = await request(app).get(`/api/plants/${plantId}/notes`);
    expect(res.status).toBe(200);
    expect(res.body.map((n: { body: string }) => n.body)).toEqual(['new', 'old']);
  });

  it('returns 404 for unknown plant', async () => {
    const res = await request(app).get('/api/plants/9999/notes');
    expect(res.status).toBe(404);
  });
});

describe('POST /api/plants/:plantId/notes', () => {
  let app: express.Express;
  let db: Database.Database;
  let plantId: number;

  beforeEach(() => {
    ({ app, db, plantId } = createTestApp());
  });

  afterEach(() => {
    db.close();
  });

  it('creates a note and returns it with a timestamp', async () => {
    const res = await request(app)
      .post(`/api/plants/${plantId}/notes`)
      .send({ body: 'Leaves looking droopy' });

    expect(res.status).toBe(201);
    expect(res.body.body).toBe('Leaves looking droopy');
    expect(res.body.plant_id).toBe(plantId);
    expect(typeof res.body.created_at).toBe('string');
    expect(res.body.updated_at).toBeNull();
  });

  it('trims whitespace and rejects empty bodies', async () => {
    const res = await request(app)
      .post(`/api/plants/${plantId}/notes`)
      .send({ body: '   ' });
    expect(res.status).toBe(400);
  });

  it('returns 404 for unknown plant', async () => {
    const res = await request(app)
      .post('/api/plants/9999/notes')
      .send({ body: 'hi' });
    expect(res.status).toBe(404);
  });
});

describe('PUT /api/plants/:plantId/notes/:noteId', () => {
  let app: express.Express;
  let db: Database.Database;
  let plantId: number;

  beforeEach(() => {
    ({ app, db, plantId } = createTestApp());
  });

  afterEach(() => {
    db.close();
  });

  it('updates the body and sets updated_at', async () => {
    const created = await request(app)
      .post(`/api/plants/${plantId}/notes`)
      .send({ body: 'Needs water' });

    const res = await request(app)
      .put(`/api/plants/${plantId}/notes/${created.body.id}`)
      .send({ body: 'Needs water + fertilizer' });

    expect(res.status).toBe(200);
    expect(res.body.body).toBe('Needs water + fertilizer');
    expect(typeof res.body.updated_at).toBe('string');
  });

  it('returns 404 if note does not belong to plant', async () => {
    // Create another plant and a note under it
    const otherPlantId = Number(
      db
        .prepare(
          `INSERT INTO plants (name, base_interval, current_interval, next_water_date)
           VALUES ('Other', 7, 7, '2026-04-08')`,
        )
        .run().lastInsertRowid,
    );
    const otherNoteId = Number(
      db
        .prepare(`INSERT INTO plant_notes (plant_id, body) VALUES (?, 'other')`)
        .run(otherPlantId).lastInsertRowid,
    );

    const res = await request(app)
      .put(`/api/plants/${plantId}/notes/${otherNoteId}`)
      .send({ body: 'hijack' });

    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/plants/:plantId/notes/:noteId', () => {
  let app: express.Express;
  let db: Database.Database;
  let plantId: number;

  beforeEach(() => {
    ({ app, db, plantId } = createTestApp());
  });

  afterEach(() => {
    db.close();
  });

  it('deletes the note', async () => {
    const created = await request(app)
      .post(`/api/plants/${plantId}/notes`)
      .send({ body: 'delete me' });

    const del = await request(app).delete(
      `/api/plants/${plantId}/notes/${created.body.id}`,
    );
    expect(del.status).toBe(204);

    const listed = await request(app).get(`/api/plants/${plantId}/notes`);
    expect(listed.body).toEqual([]);
  });

  it('returns 404 for unknown note', async () => {
    const res = await request(app).delete(`/api/plants/${plantId}/notes/9999`);
    expect(res.status).toBe(404);
  });
});
