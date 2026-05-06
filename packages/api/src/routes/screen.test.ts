import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import express from 'express';
import request from 'supertest';
import { initializeSchema } from '../database/schema.js';
import { createScreenRouter } from './screen.js';

const TEST_CONFIG = {
  heatingSeasonStart: { month: 10, day: 1 },
  heatingSeasonEnd: { month: 4, day: 1 },
};

function buildApp(db: Database.Database) {
  const app = express();
  app.use(express.json());
  app.use('/api', createScreenRouter(db, TEST_CONFIG));
  return app;
}

function insertPlant(
  db: Database.Database,
  overrides: Record<string, unknown> = {}
): number {
  const defaults = {
    name: 'Test Plant',
    species: 'Testus plantus',
    location: 'Living room',
    pot_size_cm: 20,
    base_interval: 7,
    current_interval: 7,
    water_ratio: 0.25,
    water_description: 'about 1 cup',
    heating_season_modifier: 1.2,
    fertilizer_interval_weeks: 4,
    calibration_cycle: 0,
    is_converged: 0,
    archived: 0,
    next_water_date: '2026-04-07',
    last_watered_at: '2026-03-31',
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

function insertFact(
  db: Database.Database,
  text: string,
  shownCount = 0,
  isDisabled = 0
): number {
  const result = db
    .prepare(
      `INSERT INTO facts (text, source, shown_count, is_disabled) VALUES (?, 'seed', ?, ?)`
    )
    .run(text, shownCount, isDisabled);
  return result.lastInsertRowid as number;
}

function insertOrnament(db: Database.Database, imagePath: string, shownCount = 0): number {
  const result = db
    .prepare(`INSERT INTO decorative_ornaments (image_path, shown_count) VALUES (?, ?)`)
    .run(imagePath, shownCount);
  return result.lastInsertRowid as number;
}

function insertCalibrationQuestion(
  db: Database.Database,
  plantId: number,
  overrides: Record<string, unknown> = {}
): number {
  const defaults = {
    plant_id: plantId,
    question_text: 'How wet is the soil?',
    question_type: 'scale',
    scale_min_label: 'Bone dry',
    scale_max_label: 'Soaking wet',
    display_order: 0,
  };
  const fields = { ...defaults, ...overrides };
  const cols = Object.keys(fields).join(', ');
  const placeholders = Object.keys(fields)
    .map(() => '?')
    .join(', ');
  const result = db
    .prepare(`INSERT INTO calibration_questions (${cols}) VALUES (${placeholders})`)
    .run(...Object.values(fields));
  return result.lastInsertRowid as number;
}

describe('GET /api/screen/today', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = new Database(':memory:');
    initializeSchema(db);
  });

  afterEach(() => {
    db.close();
  });

  // ─── Rest day (no plants due) ─────────────────────────────────────────────

  describe('rest day — no plants due', () => {
    it('returns type "rest" when no plants are due on the given date', async () => {
      insertFact(db, 'Bamboo can grow 3 feet in a day');
      insertOrnament(db, '/assets/ornaments/ornament-1.png');

      const app = buildApp(db);
      const res = await request(app).get('/api/screen/today?date=2026-04-07');

      expect(res.status).toBe(200);
      expect(res.body.type).toBe('rest');
      expect(res.body.date).toBe('2026-04-07');
    });

    it('includes a fact with shown_count incremented', async () => {
      const factId = insertFact(db, 'Bamboo can grow 3 feet in a day', 0);
      insertOrnament(db, '/assets/ornaments/ornament-1.png');

      const app = buildApp(db);
      const res = await request(app).get('/api/screen/today?date=2026-04-07');

      expect(res.status).toBe(200);
      expect(res.body.fact).toMatchObject({
        id: factId,
        text: 'Bamboo can grow 3 feet in a day',
      });

      // shown_count should be incremented
      const updated = db
        .prepare('SELECT shown_count FROM facts WHERE id = ?')
        .get(factId) as { shown_count: number };
      expect(updated.shown_count).toBe(1);
    });

    it('picks a never-shown fact over already-shown facts (#38)', async () => {
      // Two facts already shown, one never shown. New picker prefers shown_at=NULL.
      db.prepare(
        `INSERT INTO facts (text, source, shown_count, shown_at) VALUES (?, 'seed', ?, ?)`,
      ).run('Fact A', 5, '2026-04-01 00:00:00');
      const neverShownId = db
        .prepare(
          `INSERT INTO facts (text, source, shown_count, shown_at) VALUES (?, 'seed', 0, NULL)`,
        )
        .run('Fact B — never shown').lastInsertRowid as number;
      db.prepare(
        `INSERT INTO facts (text, source, shown_count, shown_at) VALUES (?, 'seed', ?, ?)`,
      ).run('Fact C', 10, '2026-04-02 00:00:00');
      insertOrnament(db, '/assets/ornaments/ornament-1.png');

      const app = buildApp(db);
      const res = await request(app).get('/api/screen/today?date=2026-04-07');

      expect(res.body.fact.id).toBe(neverShownId);
      expect(res.body.fact.text).toBe('Fact B — never shown');
    });

    it('includes an ornament', async () => {
      insertFact(db, 'Some fact');
      const ornId = insertOrnament(db, '/assets/ornaments/ornament-3.png');

      const app = buildApp(db);
      const res = await request(app).get('/api/screen/today?date=2026-04-07');

      expect(res.status).toBe(200);
      expect(res.body.ornament).toMatchObject({
        id: ornId,
        imagePath: '/assets/ornaments/ornament-3.png',
      });
    });

    it('picks ornament with the lowest shown_count', async () => {
      insertOrnament(db, '/assets/ornaments/ornament-1.png', 5);
      const lowId = insertOrnament(db, '/assets/ornaments/ornament-2.png', 1);
      insertFact(db, 'Some fact');

      const app = buildApp(db);
      const res = await request(app).get('/api/screen/today?date=2026-04-07');

      expect(res.body.ornament.id).toBe(lowId);
    });

    it('includes nextWatering when a future plant exists', async () => {
      insertFact(db, 'Some fact');
      insertOrnament(db, '/assets/ornaments/ornament-1.png');
      insertPlant(db, {
        name: 'Monstera',
        next_water_date: '2026-04-10',
        current_interval: 7,
      });

      const app = buildApp(db);
      const res = await request(app).get('/api/screen/today?date=2026-04-07');

      expect(res.body.nextWatering).toMatchObject({
        name: 'Monstera',
        date: '2026-04-10',
        interval: 7,
      });
    });

    it('nextWatering is null when no future plants exist', async () => {
      insertFact(db, 'Some fact');
      insertOrnament(db, '/assets/ornaments/ornament-1.png');

      const app = buildApp(db);
      const res = await request(app).get('/api/screen/today?date=2026-04-07');

      expect(res.body.nextWatering).toBeNull();
    });

    it('includes empty overdue array when no plants are overdue', async () => {
      insertFact(db, 'Some fact');
      insertOrnament(db, '/assets/ornaments/ornament-1.png');

      const app = buildApp(db);
      const res = await request(app).get('/api/screen/today?date=2026-04-07');

      expect(res.body.overdue).toEqual([]);
    });

    it('includes overdue plants sorted by daysOverdue DESC', async () => {
      insertFact(db, 'Some fact');
      insertOrnament(db, '/assets/ornaments/ornament-1.png');

      const id1 = insertPlant(db, {
        name: 'Pothos',
        next_water_date: '2026-04-05',
      });
      const id2 = insertPlant(db, {
        name: 'Cactus',
        next_water_date: '2026-04-04',
      });
      insertPlant(db, {
        name: 'Monstera',
        next_water_date: '2026-04-10',
      });

      const app = buildApp(db);
      const res = await request(app).get('/api/screen/today?date=2026-04-07');

      expect(res.body.overdue).toHaveLength(2);
      // Most overdue first
      expect(res.body.overdue[0].id).toBe(id2);
      expect(res.body.overdue[0].name).toBe('Cactus');
      expect(res.body.overdue[0].daysOverdue).toBe(3);
      expect(res.body.overdue[1].id).toBe(id1);
      expect(res.body.overdue[1].name).toBe('Pothos');
      expect(res.body.overdue[1].daysOverdue).toBe(2);
    });

    it('excludes archived plants from overdue list', async () => {
      insertFact(db, 'Some fact');
      insertOrnament(db, '/assets/ornaments/ornament-1.png');

      insertPlant(db, {
        name: 'Archived Pothos',
        next_water_date: '2026-04-04',
        archived: 1,
      });

      const app = buildApp(db);
      const res = await request(app).get('/api/screen/today?date=2026-04-07');

      expect(res.body.overdue).toEqual([]);
    });
  });

  // ─── Watering day ─────────────────────────────────────────────────────────

  describe('watering day — plants due today', () => {
    it('returns type "watering" when plants are due', async () => {
      insertPlant(db, { name: 'Monstera', next_water_date: '2026-04-07' });
      insertCalibrationQuestion(db, 1);

      const app = buildApp(db);
      const res = await request(app).get('/api/screen/today?date=2026-04-07');

      expect(res.status).toBe(200);
      expect(res.body.type).toBe('watering');
      expect(res.body.date).toBe('2026-04-07');
    });

    it('includes plants array with all required fields', async () => {
      const plantId = insertPlant(db, {
        name: 'Monstera',
        species: 'Monstera deliciosa',
        location: 'Living room',
        pot_size_cm: 25,
        water_ratio: 0.25,
        water_description: 'about 1.5 cups',
        illustration_path: '/assets/plants/monstera.png',
        next_water_date: '2026-04-07',
      });
      insertCalibrationQuestion(db, plantId);

      const app = buildApp(db);
      const res = await request(app).get('/api/screen/today?date=2026-04-07');

      expect(res.status).toBe(200);
      const plant = res.body.plants[0];
      expect(plant.id).toBe(plantId);
      expect(plant.name).toBe('Monstera');
      expect(plant.species).toBe('Monstera deliciosa');
      expect(plant.location).toBe('Living room');
      expect(plant.potSizeCm).toBe(25);
      expect(plant.waterDescription).toBe('about 1.5 cups');
      expect(plant.illustrationPath).toBe('/assets/plants/monstera.png');
    });

    it('calculates waterAmountMl using calculateWaterAmount', async () => {
      // April 7 is NOT heating season (Apr 1 ends), so modifier = 1.0
      const plantId = insertPlant(db, {
        name: 'Monstera',
        pot_size_cm: 20,
        water_ratio: 0.25,
        heating_season_modifier: 1.2,
        next_water_date: '2026-04-07',
      });
      insertCalibrationQuestion(db, plantId);

      const app = buildApp(db);
      const res = await request(app).get('/api/screen/today?date=2026-04-07');

      // pot volume: PI * 10^2 * (20*0.85) = PI * 100 * 17 = ~5340ml; * 0.25 = ~1335ml
      const expected = Math.round(Math.PI * 10 * 10 * 17 * 0.25);
      expect(res.body.plants[0].waterAmountMl).toBe(expected);
    });

    it('applies heating season modifier when active', async () => {
      // November is heating season (Oct 1 – Apr 1)
      const plantId = insertPlant(db, {
        name: 'Monstera',
        pot_size_cm: 20,
        water_ratio: 0.25,
        heating_season_modifier: 1.2,
        next_water_date: '2026-11-01',
      });
      insertCalibrationQuestion(db, plantId);

      const app = buildApp(db);
      const res = await request(app).get('/api/screen/today?date=2026-11-01');

      const expected = Math.round(Math.PI * 10 * 10 * 17 * 0.25 * 1.2);
      expect(res.body.plants[0].waterAmountMl).toBe(expected);
    });

    it('uses illustration_path when available, falls back to placeholder', async () => {
      const withPath = insertPlant(db, {
        name: 'With Path',
        illustration_path: '/assets/plants/custom.png',
        next_water_date: '2026-04-07',
      });
      insertCalibrationQuestion(db, withPath);

      const withoutPath = insertPlant(db, {
        name: 'Without Path',
        illustration_path: null,
        next_water_date: '2026-04-07',
      });
      insertCalibrationQuestion(db, withoutPath);

      const app = buildApp(db);
      const res = await request(app).get('/api/screen/today?date=2026-04-07');

      const plants = res.body.plants as Array<{ name: string; illustrationPath: string }>;
      const withPathPlant = plants.find((p) => p.name === 'With Path');
      const withoutPathPlant = plants.find((p) => p.name === 'Without Path');

      expect(withPathPlant?.illustrationPath).toBe('/assets/plants/custom.png');
      expect(withoutPathPlant?.illustrationPath).toBe('/assets/plants/placeholder.png');
    });

    it('limits plants to max 2', async () => {
      for (let i = 0; i < 3; i++) {
        const plantId = insertPlant(db, {
          name: `Plant ${i}`,
          next_water_date: '2026-04-07',
        });
        insertCalibrationQuestion(db, plantId);
      }

      const app = buildApp(db);
      const res = await request(app).get('/api/screen/today?date=2026-04-07');

      expect(res.body.plants).toHaveLength(2);
    });

    it('returns two plants when two are due today', async () => {
      const id1 = insertPlant(db, {
        name: 'Monstera',
        next_water_date: '2026-04-07',
      });
      insertCalibrationQuestion(db, id1);

      const id2 = insertPlant(db, {
        name: 'Pothos',
        next_water_date: '2026-04-07',
      });
      insertCalibrationQuestion(db, id2);

      const app = buildApp(db);
      const res = await request(app).get('/api/screen/today?date=2026-04-07');

      expect(res.status).toBe(200);
      expect(res.body.type).toBe('watering');
      expect(res.body.plants).toHaveLength(2);
      const names = (res.body.plants as Array<{ name: string }>).map((p) => p.name).sort();
      expect(names).toEqual(['Monstera', 'Pothos']);
    });

    it('includes fertilizer due status — true when due', async () => {
      // Not heating season (Apr 7), last fertilized > 4 weeks ago
      const plantId = insertPlant(db, {
        name: 'Monstera',
        next_water_date: '2026-04-07',
        fertilizer_interval_weeks: 4,
        last_fertilized_at: '2026-01-01',
      });
      insertCalibrationQuestion(db, plantId);

      const app = buildApp(db);
      const res = await request(app).get('/api/screen/today?date=2026-04-07');

      expect(res.body.plants[0].fertilizerDue).toBe(true);
    });

    it('includes fertilizer due status — false during heating season', async () => {
      // November is heating season
      const plantId = insertPlant(db, {
        name: 'Monstera',
        next_water_date: '2026-11-01',
        fertilizer_interval_weeks: 4,
        last_fertilized_at: '2025-01-01',
      });
      insertCalibrationQuestion(db, plantId);

      const app = buildApp(db);
      const res = await request(app).get('/api/screen/today?date=2026-11-01');

      expect(res.body.plants[0].fertilizerDue).toBe(false);
    });

    it('includes watchFor from the most severe active condition', async () => {
      const plantId = insertPlant(db, {
        name: 'Monstera',
        next_water_date: '2026-04-07',
      });
      insertCalibrationQuestion(db, plantId);

      db.prepare(
        `INSERT INTO plant_conditions (plant_id, condition_name, symptoms, severity, is_active)
         VALUES (?, ?, ?, ?, 1)`
      ).run(plantId, 'Yellowing tips', 'Yellow leaves', 'warning');

      db.prepare(
        `INSERT INTO plant_conditions (plant_id, condition_name, symptoms, severity, is_active)
         VALUES (?, ?, ?, ?, 1)`
      ).run(plantId, 'Root rot', 'Mushy roots', 'critical');

      const app = buildApp(db);
      const res = await request(app).get('/api/screen/today?date=2026-04-07');

      // Should pick the most severe (critical)
      expect(res.body.plants[0].watchFor).toBe('Root rot');
    });

    it('watchFor is null when no active conditions', async () => {
      const plantId = insertPlant(db, {
        name: 'Monstera',
        next_water_date: '2026-04-07',
      });
      insertCalibrationQuestion(db, plantId);

      const app = buildApp(db);
      const res = await request(app).get('/api/screen/today?date=2026-04-07');

      expect(res.body.plants[0].watchFor).toBeNull();
    });

    it('includes calibration question object for non-converged plant', async () => {
      const plantId = insertPlant(db, {
        name: 'Monstera',
        next_water_date: '2026-04-07',
        is_converged: 0,
        calibration_cycle: 0,
      });
      insertCalibrationQuestion(db, plantId);

      const app = buildApp(db);
      const res = await request(app).get('/api/screen/today?date=2026-04-07');

      const calibration = res.body.plants[0].calibration;
      expect(calibration.questionText).toBe('How wet is the soil?');
      expect(calibration.scaleMinLabel).toBe('Bone dry');
      expect(calibration.scaleMaxLabel).toBe('Soaking wet');
      expect(calibration.skip).toBeUndefined();
    });

    it('includes skip calibration for converged plant at non-check cycle', async () => {
      const plantId = insertPlant(db, {
        name: 'Monstera',
        next_water_date: '2026-04-07',
        is_converged: 1,
        calibration_cycle: 1,
      });
      insertCalibrationQuestion(db, plantId);

      const app = buildApp(db);
      const res = await request(app).get('/api/screen/today?date=2026-04-07');

      const calibration = res.body.plants[0].calibration;
      expect(calibration.skip).toBe(true);
      expect(calibration.reason).toBe('converged');
    });

    it('includes calibration question for converged plant at cycle % 3 === 0', async () => {
      const plantId = insertPlant(db, {
        name: 'Monstera',
        next_water_date: '2026-04-07',
        is_converged: 1,
        calibration_cycle: 3,
      });
      insertCalibrationQuestion(db, plantId);

      const app = buildApp(db);
      const res = await request(app).get('/api/screen/today?date=2026-04-07');

      const calibration = res.body.plants[0].calibration;
      expect(calibration.questionText).toBeDefined();
      expect(calibration.skip).toBeUndefined();
    });

    it('includes nextWatering pointing to the next plant after today\'s list', async () => {
      const p1 = insertPlant(db, {
        name: 'Today Plant',
        next_water_date: '2026-04-07',
        current_interval: 7,
      });
      insertCalibrationQuestion(db, p1);

      insertPlant(db, {
        name: 'Next Plant',
        next_water_date: '2026-04-09',
        current_interval: 5,
      });

      const app = buildApp(db);
      const res = await request(app).get('/api/screen/today?date=2026-04-07');

      expect(res.body.nextWatering).toMatchObject({
        name: 'Next Plant',
        date: '2026-04-09',
        interval: 5,
      });
    });

    it('nextWatering is null when no future plants exist', async () => {
      const plantId = insertPlant(db, {
        name: 'Monstera',
        next_water_date: '2026-04-07',
      });
      insertCalibrationQuestion(db, plantId);

      const app = buildApp(db);
      const res = await request(app).get('/api/screen/today?date=2026-04-07');

      expect(res.body.nextWatering).toBeNull();
    });

    it("includes today's fact on a watering day (#38)", async () => {
      const plantId = insertPlant(db, { name: 'Monstera', next_water_date: '2026-04-07' });
      insertCalibrationQuestion(db, plantId);
      const factId = insertFact(db, 'Monsteras love humidity');

      const app = buildApp(db);
      const res = await request(app).get('/api/screen/today?date=2026-04-07');

      expect(res.body.type).toBe('watering');
      expect(res.body.fact).toMatchObject({ id: factId, text: 'Monsteras love humidity' });
    });

    it("fact is null on a watering day when no facts exist (#38)", async () => {
      const plantId = insertPlant(db, { name: 'Monstera', next_water_date: '2026-04-07' });
      insertCalibrationQuestion(db, plantId);

      const app = buildApp(db);
      const res = await request(app).get('/api/screen/today?date=2026-04-07');

      expect(res.body.type).toBe('watering');
      expect(res.body.fact).toBeNull();
    });
  });

  // ─── Date defaults ────────────────────────────────────────────────────────

  describe('?date parameter', () => {
    it('uses today when no ?date param is given', async () => {
      insertFact(db, 'Some fact');
      insertOrnament(db, '/assets/ornaments/ornament-1.png');

      const app = buildApp(db);
      const res = await request(app).get('/api/screen/today');

      expect(res.status).toBe(200);
      // Just check it responds — today may or may not have plants
      expect(res.body.date).toBe(new Date().toISOString().slice(0, 10));
    });
  });
});
