import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import Database from 'better-sqlite3';
import { initializeSchema } from '../database/schema.js';
import { createEnrichmentRouter } from './callback.js';

function buildApp(db: Database.Database) {
  const app = express();
  app.use(express.json());
  app.use('/api/enrichment', createEnrichmentRouter(db));
  return app;
}

function seedPlant(db: Database.Database, overrides: Record<string, unknown> = {}) {
  const result = db.prepare(
    `INSERT INTO plants (name, pot_size_cm, plant_size, location, light_level,
       base_interval, current_interval, last_watered_at, next_water_date, enrichment_status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`
  ).run(
    overrides.name ?? 'Monstera',
    overrides.pot_size_cm ?? 25,
    overrides.plant_size ?? 'large',
    overrides.location ?? 'living room',
    overrides.light_level ?? 'bright_indirect',
    overrides.base_interval ?? 7,
    overrides.current_interval ?? 7,
    overrides.last_watered_at ?? '2026-04-01',
    overrides.next_water_date ?? '2026-04-08'
  );
  return Number(result.lastInsertRowid);
}

function seedQueue(db: Database.Database, plantId: number, status = 'pending') {
  const result = db.prepare(
    `INSERT INTO enrichment_queue (plant_id, status) VALUES (?, ?)`
  ).run(plantId, status);
  return Number(result.lastInsertRowid);
}

const validPayload = {
  plant_id: 1,
  base_interval: 7,
  water_ratio: 0.035,
  water_description: 'about 1.5 cups',
  fertilizer_interval_weeks: 4,
  heating_season_modifier: 0.85,
  calibration_questions: [
    {
      question_text: 'How wet is the soil?',
      question_type: 'soil_moisture',
      scale_min_label: 'Bone dry',
      scale_max_label: 'Soaking wet',
    },
    {
      question_text: 'How droopy are the leaves?',
      question_type: 'droopiness',
      scale_min_label: 'Perky',
      scale_max_label: 'Very droopy',
    },
  ],
  common_conditions: [
    {
      condition_name: 'Yellowing leaves',
      symptoms: 'Lower leaves turn yellow',
      remedy: 'Reduce watering frequency',
      severity: 'warning',
    },
  ],
  facts: ['Fact 1 about monstera.', 'Fact 2 about monstera.'],
  watch_for: 'Yellowing tips',
  illustration_url: 'https://example.com/monstera.png',
};

describe('POST /api/enrichment/callback', () => {
  let db: Database.Database;
  let app: ReturnType<typeof buildApp>;
  let plantId: number;

  beforeEach(() => {
    db = new Database(':memory:');
    initializeSchema(db);
    app = buildApp(db);
    plantId = seedPlant(db);
    seedQueue(db, plantId);
  });

  afterEach(() => {
    db.close();
  });

  it('updates the plant with enrichment data', async () => {
    const payload = { ...validPayload, plant_id: plantId };

    const res = await request(app).post('/api/enrichment/callback').send(payload);

    expect(res.status).toBe(200);

    const plant = db.prepare('SELECT * FROM plants WHERE id = ?').get(plantId) as any;
    expect(plant.base_interval).toBe(7);
    expect(plant.current_interval).toBe(7);
    expect(plant.water_ratio).toBeCloseTo(0.035);
    expect(plant.water_description).toBe('about 1.5 cups');
    expect(plant.fertilizer_interval_weeks).toBe(4);
    expect(plant.heating_season_modifier).toBeCloseTo(0.85);
  });

  it('sets enrichment_status to complete', async () => {
    const payload = { ...validPayload, plant_id: plantId };

    await request(app).post('/api/enrichment/callback').send(payload);

    const plant = db.prepare('SELECT enrichment_status FROM plants WHERE id = ?').get(plantId) as any;
    expect(plant.enrichment_status).toBe('complete');
  });

  it('recalculates next_water_date using new base_interval', async () => {
    const payload = { ...validPayload, plant_id: plantId, base_interval: 10 };

    await request(app).post('/api/enrichment/callback').send(payload);

    const plant = db.prepare('SELECT next_water_date, last_watered_at FROM plants WHERE id = ?').get(plantId) as any;
    // last_watered_at = '2026-04-01', interval = 10 → 2026-04-11
    expect(plant.next_water_date).toBe('2026-04-11');
  });

  it('inserts calibration questions', async () => {
    const payload = { ...validPayload, plant_id: plantId };

    await request(app).post('/api/enrichment/callback').send(payload);

    const questions = db.prepare(
      'SELECT * FROM calibration_questions WHERE plant_id = ?'
    ).all(plantId) as any[];

    expect(questions).toHaveLength(2);
    expect(questions[0].question_text).toBe('How wet is the soil?');
    expect(questions[0].question_type).toBe('soil_moisture');
    expect(questions[0].scale_min_label).toBe('Bone dry');
    expect(questions[0].scale_max_label).toBe('Soaking wet');
    expect(questions[1].question_text).toBe('How droopy are the leaves?');
  });

  it('inserts facts with source=enrichment and correct plant_id', async () => {
    const payload = { ...validPayload, plant_id: plantId };

    await request(app).post('/api/enrichment/callback').send(payload);

    const facts = db.prepare(
      'SELECT * FROM facts WHERE plant_id = ?'
    ).all(plantId) as any[];

    expect(facts).toHaveLength(2);
    expect(facts.every((f) => f.source === 'enrichment')).toBe(true);
    expect(facts.every((f) => f.plant_id === plantId)).toBe(true);
    expect(facts.map((f) => f.text)).toContain('Fact 1 about monstera.');
    expect(facts.map((f) => f.text)).toContain('Fact 2 about monstera.');
  });

  it('inserts common conditions as inactive templates', async () => {
    const payload = { ...validPayload, plant_id: plantId };

    await request(app).post('/api/enrichment/callback').send(payload);

    const conditions = db.prepare(
      'SELECT * FROM plant_conditions WHERE plant_id = ?'
    ).all(plantId) as any[];

    expect(conditions).toHaveLength(1);
    expect(conditions[0].condition_name).toBe('Yellowing leaves');
    expect(conditions[0].symptoms).toBe('Lower leaves turn yellow');
    expect(conditions[0].remedy).toBe('Reduce watering frequency');
    expect(conditions[0].severity).toBe('warning');
    expect(conditions[0].is_active).toBe(0);
    expect(conditions[0].detected_via).toBe('calibration');
  });

  it('stores illustration_url as illustration_path', async () => {
    const payload = { ...validPayload, plant_id: plantId };

    await request(app).post('/api/enrichment/callback').send(payload);

    const plant = db.prepare('SELECT illustration_path FROM plants WHERE id = ?').get(plantId) as any;
    expect(plant.illustration_path).toBe('https://example.com/monstera.png');
  });

  it('updates enrichment_queue status to complete', async () => {
    const payload = { ...validPayload, plant_id: plantId };

    await request(app).post('/api/enrichment/callback').send(payload);

    const queue = db.prepare(
      'SELECT * FROM enrichment_queue WHERE plant_id = ?'
    ).get(plantId) as any;

    expect(queue.status).toBe('complete');
  });

  it('logs enrichment_complete event', async () => {
    const payload = { ...validPayload, plant_id: plantId };

    await request(app).post('/api/enrichment/callback').send(payload);

    const events = db.prepare(
      `SELECT * FROM event_log WHERE plant_id = ? AND event_type = 'enrichment_complete'`
    ).all(plantId) as any[];

    expect(events).toHaveLength(1);
  });

  it('returns 404 if plant not found', async () => {
    const payload = { ...validPayload, plant_id: 9999 };

    const res = await request(app).post('/api/enrichment/callback').send(payload);

    expect(res.status).toBe(404);
  });

  it('works when no illustration_url is provided', async () => {
    const { illustration_url: _, ...payloadWithoutIllustration } = validPayload;
    const payload = { ...payloadWithoutIllustration, plant_id: plantId };

    const res = await request(app).post('/api/enrichment/callback').send(payload);

    expect(res.status).toBe(200);
    const plant = db.prepare('SELECT illustration_path FROM plants WHERE id = ?').get(plantId) as any;
    expect(plant.illustration_path).toBeNull();
  });

  it('sets current_interval equal to base_interval from payload', async () => {
    const payload = { ...validPayload, plant_id: plantId, base_interval: 14 };

    await request(app).post('/api/enrichment/callback').send(payload);

    const plant = db.prepare('SELECT base_interval, current_interval FROM plants WHERE id = ?').get(plantId) as any;
    expect(plant.base_interval).toBe(14);
    expect(plant.current_interval).toBe(14);
  });
});
