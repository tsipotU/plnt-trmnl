import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import express from 'express';
import request from 'supertest';
import { initializeSchema } from '../database/schema.js';
import { createFactsRouter } from './facts.js';

function buildApp(db: Database.Database) {
  const app = express();
  app.use(express.json());
  app.use('/api', createFactsRouter(db));
  return app;
}

function seedFact(db: Database.Database, text: string, shownCount = 0, isDisabled = 0) {
  return db.prepare(
    `INSERT INTO facts (text, source, shown_count, is_disabled) VALUES (?, 'seed', ?, ?)`
  ).run(text, shownCount, isDisabled);
}

describe('facts routes', () => {
  let db: Database.Database;
  let app: ReturnType<typeof buildApp>;

  beforeEach(() => {
    db = new Database(':memory:');
    initializeSchema(db);
    app = buildApp(db);
  });

  afterEach(() => {
    db.close();
  });

  describe('GET /api/facts', () => {
    it('returns empty array when no facts exist', async () => {
      const res = await request(app).get('/api/facts');
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('returns seeded facts', async () => {
      seedFact(db, 'Bamboo grows fast');
      seedFact(db, 'Cactus stores water');

      const res = await request(app).get('/api/facts');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
    });

    it('returns expected fields: id, text, source, plant_id, shown_count, is_disabled', async () => {
      seedFact(db, 'Bamboo grows fast');

      const res = await request(app).get('/api/facts');
      expect(res.status).toBe(200);
      const fact = res.body[0];
      expect(fact).toHaveProperty('id');
      expect(fact).toHaveProperty('text');
      expect(fact).toHaveProperty('source');
      expect(fact).toHaveProperty('plant_id');
      expect(fact).toHaveProperty('shown_count');
      expect(fact).toHaveProperty('is_disabled');
    });

    it('filters by text when ?q= is provided', async () => {
      seedFact(db, 'Bamboo grows incredibly fast');
      seedFact(db, 'Cactus stores water in its stem');
      seedFact(db, 'Bamboo is technically a grass');

      const res = await request(app).get('/api/facts?q=bamboo');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
      expect(res.body.every((f: any) => f.text.toLowerCase().includes('bamboo'))).toBe(true);
    });

    it('filter is case-insensitive', async () => {
      seedFact(db, 'Bamboo grows incredibly fast');

      const res = await request(app).get('/api/facts?q=BAMBOO');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
    });

    it('returns all facts when ?q= is empty string', async () => {
      seedFact(db, 'Bamboo grows fast');
      seedFact(db, 'Cactus stores water');

      const res = await request(app).get('/api/facts?q=');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
    });
  });

  describe('GET /api/facts/next', () => {
    it('returns 404 when no facts are available', async () => {
      const res = await request(app).get('/api/facts/next');
      expect(res.status).toBe(404);
    });

    it('returns a fact with the lowest shown_count', async () => {
      seedFact(db, 'Fact A', 5);
      seedFact(db, 'Fact B', 1);
      seedFact(db, 'Fact C', 10);

      const res = await request(app).get('/api/facts/next');
      expect(res.status).toBe(200);
      expect(res.body.text).toBe('Fact B');
    });

    it('increments shown_count after returning the fact', async () => {
      const result = seedFact(db, 'Only fact', 0);
      const factId = Number(result.lastInsertRowid);

      await request(app).get('/api/facts/next');

      const updated = db.prepare('SELECT shown_count FROM facts WHERE id = ?').get(factId) as any;
      expect(updated.shown_count).toBe(1);
    });

    it('returns 404 when all facts are disabled', async () => {
      seedFact(db, 'Disabled fact', 0, 1);

      const res = await request(app).get('/api/facts/next');
      expect(res.status).toBe(404);
    });

    it('skips disabled facts', async () => {
      seedFact(db, 'Disabled fact', 0, 1);
      seedFact(db, 'Active fact', 5, 0);

      const res = await request(app).get('/api/facts/next');
      expect(res.status).toBe(200);
      expect(res.body.text).toBe('Active fact');
    });
  });

  describe('POST /api/facts/:id/disable', () => {
    it('sets is_disabled to 1', async () => {
      const result = seedFact(db, 'Fact to disable');
      const factId = Number(result.lastInsertRowid);

      const res = await request(app).post(`/api/facts/${factId}/disable`);
      expect(res.status).toBe(200);
      expect(res.body.is_disabled).toBe(1);
    });

    it('removes the fact from the next rotation', async () => {
      const result = seedFact(db, 'Only fact', 0);
      const factId = Number(result.lastInsertRowid);

      await request(app).post(`/api/facts/${factId}/disable`);

      const nextRes = await request(app).get('/api/facts/next');
      expect(nextRes.status).toBe(404);
    });

    it('returns 404 when fact does not exist', async () => {
      const res = await request(app).post('/api/facts/9999/disable');
      expect(res.status).toBe(404);
    });

    it('logs a fact_disabled event', async () => {
      const result = seedFact(db, 'Harmful fact');
      const factId = Number(result.lastInsertRowid);

      await request(app).post(`/api/facts/${factId}/disable`);

      const events = db.prepare(
        `SELECT * FROM event_log WHERE event_type = 'fact_disabled'`
      ).all() as any[];

      expect(events).toHaveLength(1);
      expect(events[0].new_value).toBe(String(factId));
    });
  });
});
