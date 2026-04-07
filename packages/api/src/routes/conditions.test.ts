import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import express from 'express';
import request from 'supertest';
import { initializeSchema } from '../database/schema.js';
import { createConditionsRouter } from './conditions.js';

function buildApp(db: Database.Database) {
  const app = express();
  app.use(express.json());
  app.use('/api', createConditionsRouter(db));
  return app;
}

describe('conditions routes', () => {
  let db: Database.Database;
  let app: ReturnType<typeof buildApp>;
  let plantId: number;

  beforeEach(() => {
    db = new Database(':memory:');
    initializeSchema(db);
    // Create a plant to satisfy FK constraint
    const result = db.prepare(
      `INSERT INTO plants (name, base_interval, current_interval) VALUES (?, ?, ?)`
    ).run('Test Plant', 7, 7);
    plantId = Number(result.lastInsertRowid);
    app = buildApp(db);
  });

  afterEach(() => {
    db.close();
  });

  describe('POST /api/plants/:id/conditions', () => {
    it('creates a condition and returns 201 with the created record', async () => {
      const res = await request(app)
        .post(`/api/plants/${plantId}/conditions`)
        .send({ conditionName: 'Root rot', symptoms: 'Yellow leaves', remedy: 'Repot' });

      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.condition_name).toBe('Root rot');
      expect(res.body.symptoms).toBe('Yellow leaves');
      expect(res.body.remedy).toBe('Repot');
    });

    it('sets detected_via to manual and is_active to 1 by default', async () => {
      const res = await request(app)
        .post(`/api/plants/${plantId}/conditions`)
        .send({ conditionName: 'Overwatering' });

      expect(res.status).toBe(201);
      expect(res.body.detected_via).toBe('manual');
      expect(res.body.is_active).toBe(1);
    });

    it('defaults severity to info when not provided', async () => {
      const res = await request(app)
        .post(`/api/plants/${plantId}/conditions`)
        .send({ conditionName: 'Minor yellowing' });

      expect(res.status).toBe(201);
      expect(res.body.severity).toBe('info');
    });

    it('accepts a custom severity', async () => {
      const res = await request(app)
        .post(`/api/plants/${plantId}/conditions`)
        .send({ conditionName: 'Severe rot', severity: 'critical' });

      expect(res.status).toBe(201);
      expect(res.body.severity).toBe('critical');
    });

    it('returns 400 when conditionName is missing', async () => {
      const res = await request(app)
        .post(`/api/plants/${plantId}/conditions`)
        .send({});

      expect(res.status).toBe(400);
    });

    it('returns 404 when plant does not exist', async () => {
      const res = await request(app)
        .post('/api/plants/9999/conditions')
        .send({ conditionName: 'Test' });

      expect(res.status).toBe(404);
    });

    it('logs a condition_detected event', async () => {
      await request(app)
        .post(`/api/plants/${plantId}/conditions`)
        .send({ conditionName: 'Spider mites' });

      const events = db.prepare(
        `SELECT * FROM event_log WHERE plant_id = ? AND event_type = 'condition_detected'`
      ).all(plantId) as any[];

      expect(events).toHaveLength(1);
      expect(events[0].new_value).toBe('Spider mites');
    });
  });

  describe('GET /api/plants/:id/conditions', () => {
    it('returns empty array when plant has no conditions', async () => {
      const res = await request(app).get(`/api/plants/${plantId}/conditions`);
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('returns conditions for a plant', async () => {
      await request(app)
        .post(`/api/plants/${plantId}/conditions`)
        .send({ conditionName: 'Root rot' });

      const res = await request(app).get(`/api/plants/${plantId}/conditions`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].condition_name).toBe('Root rot');
    });

    it('shows active conditions before resolved ones', async () => {
      // Create two conditions
      const c1 = await request(app)
        .post(`/api/plants/${plantId}/conditions`)
        .send({ conditionName: 'Root rot' });
      const c2 = await request(app)
        .post(`/api/plants/${plantId}/conditions`)
        .send({ conditionName: 'Spider mites' });

      // Resolve the first one
      await request(app).post(`/api/conditions/${c1.body.id}/resolve`);

      const res = await request(app).get(`/api/plants/${plantId}/conditions`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
      // Active condition comes first
      expect(res.body[0].is_active).toBe(1);
      expect(res.body[0].condition_name).toBe('Spider mites');
      // Resolved condition comes after
      expect(res.body[1].is_active).toBe(0);
      expect(res.body[1].condition_name).toBe('Root rot');
    });

    it('returns 404 when plant does not exist', async () => {
      const res = await request(app).get('/api/plants/9999/conditions');
      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/conditions/:id/resolve', () => {
    it('sets is_active to 0 and resolved_at', async () => {
      const createRes = await request(app)
        .post(`/api/plants/${plantId}/conditions`)
        .send({ conditionName: 'Root rot' });

      const conditionId = createRes.body.id;
      const resolveRes = await request(app).post(`/api/conditions/${conditionId}/resolve`);

      expect(resolveRes.status).toBe(200);
      expect(resolveRes.body.is_active).toBe(0);
      expect(resolveRes.body.resolved_at).not.toBeNull();
    });

    it('returns 404 when condition does not exist', async () => {
      const res = await request(app).post('/api/conditions/9999/resolve');
      expect(res.status).toBe(404);
    });

    it('logs a condition_resolved event', async () => {
      const createRes = await request(app)
        .post(`/api/plants/${plantId}/conditions`)
        .send({ conditionName: 'Overwatering' });

      const conditionId = createRes.body.id;
      await request(app).post(`/api/conditions/${conditionId}/resolve`);

      const events = db.prepare(
        `SELECT * FROM event_log WHERE plant_id = ? AND event_type = 'condition_resolved'`
      ).all(plantId) as any[];

      expect(events).toHaveLength(1);
      expect(events[0].new_value).toBe('Overwatering');
    });
  });
});
