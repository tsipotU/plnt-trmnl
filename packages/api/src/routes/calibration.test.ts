import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import express from 'express';
import request from 'supertest';
import { initializeSchema } from '../database/schema.js';
import { createCalibrationRouter } from './calibration.js';

function buildApp(db: Database.Database) {
  const app = express();
  app.use(express.json());
  app.use('/api', createCalibrationRouter(db));
  return app;
}

function insertPlant(
  db: Database.Database,
  overrides: Record<string, unknown> = {}
): number {
  const defaults = {
    name: 'Test Plant',
    base_interval: 7,
    current_interval: 7,
    calibration_cycle: 0,
    is_converged: 0,
    archived: 0,
    next_water_date: new Date().toISOString().slice(0, 10),
  };
  const fields = { ...defaults, ...overrides };
  const cols = Object.keys(fields).join(', ');
  const placeholders = Object.keys(fields)
    .map(() => '?')
    .join(', ');
  const result = db
    .prepare(`INSERT INTO plants (${cols}) VALUES (${placeholders})`)
    .run(...Object.values(fields));
  return result.lastInsertRowid as number;
}

function insertQuestion(
  db: Database.Database,
  plantId: number,
  displayOrder = 0
): number {
  const result = db
    .prepare(
      `INSERT INTO calibration_questions (plant_id, question_text, display_order)
       VALUES (?, ?, ?)`
    )
    .run(plantId, `Question ${displayOrder}`, displayOrder);
  return result.lastInsertRowid as number;
}

describe('Calibration routes', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = new Database(':memory:');
    initializeSchema(db);
  });

  afterEach(() => {
    db.close();
  });

  // ─── GET /api/plants/:id/calibration/next ───────────────────────────────

  describe('GET /api/plants/:id/calibration/next', () => {
    it('returns 404 for unknown plant', async () => {
      const app = buildApp(db);
      const res = await request(app).get('/api/plants/999/calibration/next');
      expect(res.status).toBe(404);
    });

    it('returns first question at cycle 0', async () => {
      const plantId = insertPlant(db);
      insertQuestion(db, plantId, 0);
      insertQuestion(db, plantId, 1);

      const app = buildApp(db);
      const res = await request(app).get(
        `/api/plants/${plantId}/calibration/next`
      );
      expect(res.status).toBe(200);
      expect(res.body.question_text).toBe('Question 0');
    });

    it('returns second question at cycle 1', async () => {
      const plantId = insertPlant(db, { calibration_cycle: 1 });
      insertQuestion(db, plantId, 0);
      insertQuestion(db, plantId, 1);

      const app = buildApp(db);
      const res = await request(app).get(
        `/api/plants/${plantId}/calibration/next`
      );
      expect(res.status).toBe(200);
      expect(res.body.question_text).toBe('Question 1');
    });

    it('wraps around via modulo — cycle 2 returns first question again with 2 questions', async () => {
      const plantId = insertPlant(db, { calibration_cycle: 2 });
      insertQuestion(db, plantId, 0);
      insertQuestion(db, plantId, 1);

      const app = buildApp(db);
      const res = await request(app).get(
        `/api/plants/${plantId}/calibration/next`
      );
      expect(res.status).toBe(200);
      expect(res.body.question_text).toBe('Question 0');
    });

    it('returns skip for converged plant when cycle % 3 !== 0', async () => {
      const plantId = insertPlant(db, { is_converged: 1, calibration_cycle: 1 });
      insertQuestion(db, plantId, 0);

      const app = buildApp(db);
      const res = await request(app).get(
        `/api/plants/${plantId}/calibration/next`
      );
      expect(res.status).toBe(200);
      expect(res.body.skip).toBe(true);
      expect(res.body.reason).toBe('converged');
    });

    it('returns question for converged plant when cycle % 3 === 0', async () => {
      const plantId = insertPlant(db, { is_converged: 1, calibration_cycle: 3 });
      insertQuestion(db, plantId, 0);

      const app = buildApp(db);
      const res = await request(app).get(
        `/api/plants/${plantId}/calibration/next`
      );
      expect(res.status).toBe(200);
      expect(res.body.question_text).toBeDefined();
      expect(res.body.skip).toBeUndefined();
    });

    it('returns 404 when plant has no questions', async () => {
      const plantId = insertPlant(db);

      const app = buildApp(db);
      const res = await request(app).get(
        `/api/plants/${plantId}/calibration/next`
      );
      expect(res.status).toBe(404);
    });
  });

  // ─── POST /api/plants/:id/calibration ───────────────────────────────────

  describe('POST /api/plants/:id/calibration', () => {
    it('returns 404 for unknown plant', async () => {
      const app = buildApp(db);
      const res = await request(app)
        .post('/api/plants/999/calibration')
        .send({ questionId: 1, answerValue: 3 });
      expect(res.status).toBe(404);
    });

    it('returns 400 if answerValue is missing', async () => {
      const plantId = insertPlant(db);
      const qId = insertQuestion(db, plantId);

      const app = buildApp(db);
      const res = await request(app)
        .post(`/api/plants/${plantId}/calibration`)
        .send({ questionId: qId });
      expect(res.status).toBe(400);
    });

    it('returns 400 if answerValue is out of range', async () => {
      const plantId = insertPlant(db);
      const qId = insertQuestion(db, plantId);

      const app = buildApp(db);
      const res = await request(app)
        .post(`/api/plants/${plantId}/calibration`)
        .send({ questionId: qId, answerValue: 6 });
      expect(res.status).toBe(400);
    });

    it('answer 4 extends interval by 1', async () => {
      const plantId = insertPlant(db, { current_interval: 7 });
      const qId = insertQuestion(db, plantId);

      const app = buildApp(db);
      const res = await request(app)
        .post(`/api/plants/${plantId}/calibration`)
        .send({ questionId: qId, answerValue: 4 });

      expect(res.status).toBe(200);
      expect(res.body.current_interval).toBe(8);

      const plant = db
        .prepare('SELECT current_interval FROM plants WHERE id = ?')
        .get(plantId) as { current_interval: number };
      expect(plant.current_interval).toBe(8);
    });

    it('answer 1 shortens interval by 1', async () => {
      const plantId = insertPlant(db, { current_interval: 7 });
      const qId = insertQuestion(db, plantId);

      const app = buildApp(db);
      const res = await request(app)
        .post(`/api/plants/${plantId}/calibration`)
        .send({ questionId: qId, answerValue: 1 });

      expect(res.status).toBe(200);
      expect(res.body.current_interval).toBe(6);
    });

    it('logs a calibration event with old and new interval', async () => {
      const plantId = insertPlant(db, { current_interval: 7 });
      const qId = insertQuestion(db, plantId);

      const app = buildApp(db);
      await request(app)
        .post(`/api/plants/${plantId}/calibration`)
        .send({ questionId: qId, answerValue: 4 });

      const events = db
        .prepare(
          `SELECT * FROM event_log WHERE plant_id = ? AND event_type = 'calibration'`
        )
        .all(plantId) as Array<{
        old_value: string;
        new_value: string;
      }>;
      expect(events).toHaveLength(1);
      expect(events[0].old_value).toBe('7');
      expect(events[0].new_value).toBe('8');
    });

    it('increments calibration_cycle after answer', async () => {
      const plantId = insertPlant(db, { calibration_cycle: 0 });
      const qId = insertQuestion(db, plantId);

      const app = buildApp(db);
      await request(app)
        .post(`/api/plants/${plantId}/calibration`)
        .send({ questionId: qId, answerValue: 3 });

      const plant = db
        .prepare('SELECT calibration_cycle FROM plants WHERE id = ?')
        .get(plantId) as { calibration_cycle: number };
      expect(plant.calibration_cycle).toBe(1);
    });

    it('sets is_converged after 3 consecutive 3s', async () => {
      const plantId = insertPlant(db, { current_interval: 7 });
      const qId = insertQuestion(db, plantId);
      const app = buildApp(db);

      // Submit 3 answers of value 3
      for (let i = 0; i < 3; i++) {
        await request(app)
          .post(`/api/plants/${plantId}/calibration`)
          .send({ questionId: qId, answerValue: 3 });
      }

      const plant = db
        .prepare('SELECT is_converged FROM plants WHERE id = ?')
        .get(plantId) as { is_converged: number };
      expect(plant.is_converged).toBe(1);
    });

    it('does not set is_converged for mixed answers', async () => {
      const plantId = insertPlant(db, { current_interval: 7 });
      const qId = insertQuestion(db, plantId);
      const app = buildApp(db);

      for (const v of [3, 4, 3]) {
        await request(app)
          .post(`/api/plants/${plantId}/calibration`)
          .send({ questionId: qId, answerValue: v });
      }

      const plant = db
        .prepare('SELECT is_converged FROM plants WHERE id = ?')
        .get(plantId) as { is_converged: number };
      expect(plant.is_converged).toBe(0);
    });

    it('inserts a row into calibrations table', async () => {
      const plantId = insertPlant(db, { current_interval: 7 });
      const qId = insertQuestion(db, plantId);

      const app = buildApp(db);
      await request(app)
        .post(`/api/plants/${plantId}/calibration`)
        .send({ questionId: qId, answerValue: 4 });

      const rows = db
        .prepare('SELECT * FROM calibrations WHERE plant_id = ?')
        .all(plantId) as Array<{
        answer_value: number;
        interval_before: number;
        interval_after: number;
      }>;
      expect(rows).toHaveLength(1);
      expect(rows[0].answer_value).toBe(4);
      expect(rows[0].interval_before).toBe(7);
      expect(rows[0].interval_after).toBe(8);
    });
  });

  // ─── GET /api/calibration/due ────────────────────────────────────────────

  describe('GET /api/calibration/due', () => {
    it('returns plants with next_water_date = today', async () => {
      const today = new Date().toISOString().slice(0, 10);
      insertPlant(db, { name: 'Due Plant', next_water_date: today });

      const app = buildApp(db);
      const res = await request(app).get('/api/calibration/due');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].name).toBe('Due Plant');
    });

    it('excludes plants due on a different date', async () => {
      insertPlant(db, { name: 'Future Plant', next_water_date: '2099-12-31' });

      const app = buildApp(db);
      const res = await request(app).get('/api/calibration/due');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(0);
    });

    it('excludes archived plants', async () => {
      const today = new Date().toISOString().slice(0, 10);
      insertPlant(db, {
        name: 'Archived Plant',
        next_water_date: today,
        archived: 1,
      });

      const app = buildApp(db);
      const res = await request(app).get('/api/calibration/due');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(0);
    });

    it('excludes converged plants when cycle % 3 !== 0', async () => {
      const today = new Date().toISOString().slice(0, 10);
      insertPlant(db, {
        name: 'Converged Skip',
        next_water_date: today,
        is_converged: 1,
        calibration_cycle: 1,
      });

      const app = buildApp(db);
      const res = await request(app).get('/api/calibration/due');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(0);
    });

    it('includes converged plants when cycle % 3 === 0', async () => {
      const today = new Date().toISOString().slice(0, 10);
      insertPlant(db, {
        name: 'Converged Due',
        next_water_date: today,
        is_converged: 1,
        calibration_cycle: 3,
      });

      const app = buildApp(db);
      const res = await request(app).get('/api/calibration/due');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].name).toBe('Converged Due');
    });

    it('includes non-converged plants regardless of cycle', async () => {
      const today = new Date().toISOString().slice(0, 10);
      insertPlant(db, {
        name: 'Normal Plant',
        next_water_date: today,
        is_converged: 0,
        calibration_cycle: 2,
      });

      const app = buildApp(db);
      const res = await request(app).get('/api/calibration/due');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
    });
  });
});
