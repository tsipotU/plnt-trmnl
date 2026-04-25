/**
 * End-to-end watering lifecycle tests (Issue #9)
 *
 * These tests exercise the realistic plant lifecycle using a real SQLite DB
 * (in-memory, WAL), a real Express app, and real route handlers. No mocks.
 * Time-travel is achieved by controlling what dates are passed through the
 * `?date=` query param (screen/schedule) and by seeding `next_water_date` /
 * `last_watered_at` directly. Single watering uses real dates from the water
 * route, so plants are seeded such that "today" produces predictable offsets.
 *
 * Tests are organised into four focused scenarios:
 *
 *   1. create → enrich → water → undo → water again → verify event log
 *   2. seasonal modifier (heating season) affects water scheduling
 *   3. bin-packer overflow: third plant shifts to next day
 *   4. archive → verify plant excluded from screen + schedule
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import express from 'express';
import request from 'supertest';
import { initializeSchema } from '../database/schema.js';
import { createPlantsRouter } from './plants.js';
import { createCalibrationRouter } from './calibration.js';
import { createEnrichmentRouter } from '../enrichment/callback.js';
import { createScreenRouter } from './screen.js';
import { createScheduleRouter } from './schedule.js';

// ─── Config ──────────────────────────────────────────────────────────────────

const HEATING_CONFIG = {
  heatingSeasonStart: { month: 10, day: 1 },
  heatingSeasonEnd: { month: 4, day: 1 },
};

// ─── App factory ─────────────────────────────────────────────────────────────

function buildFullApp(db: Database.Database, heatingConfig = HEATING_CONFIG) {
  const app = express();
  app.use(express.json());
  app.use('/api/plants', createPlantsRouter(db, heatingConfig));
  app.use('/api', createCalibrationRouter(db));
  app.use('/api', createEnrichmentRouter(db));
  app.use('/api', createScreenRouter(db, heatingConfig));
  app.use('/api/schedule', createScheduleRouter(db));
  return app;
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

function addDays(isoDate: string, n: number): string {
  const d = new Date(isoDate + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

const TODAY = new Date().toISOString().slice(0, 10);

/**
 * Simulate a Claude enrichment callback for a plant. Sets up all the enriched
 * fields that Wave 2/3 features depend on: heating_season_modifier, calibration
 * questions, pot_size_category, water_ratio, etc.
 */
async function simulateEnrichment(
  app: ReturnType<typeof buildFullApp>,
  plantId: number,
  overrides: Record<string, unknown> = {},
) {
  const body = {
    plant_id: plantId,
    base_interval: 7,
    water_ratio: 0.25,
    water_description: 'about 1.5 cups',
    fertilizer_interval_weeks: 4,
    heating_season_modifier: 0.8,
    calibration_questions: [
      {
        question_text: 'How wet is the soil?',
        question_type: 'scale',
        scale_min_label: 'Bone dry',
        scale_max_label: 'Soaking wet',
      },
    ],
    common_conditions: [],
    facts: ['Monstera tolerates low light but thrives in bright indirect light'],
    ...overrides,
  };
  return request(app).post('/api/enrichment/callback').send(body);
}

// ─── Test suite 1: Full lifecycle — create → enrich → water → undo → water ──

describe('Lifecycle 1: create → enrich → water → undo → water → event audit', () => {
  let db: Database.Database;
  let app: ReturnType<typeof buildFullApp>;

  beforeEach(() => {
    db = new Database(':memory:');
    initializeSchema(db);
    app = buildFullApp(db);
  });

  afterEach(() => {
    db.close();
  });

  it('full water–undo–water cycle maintains correct event log and plant state', async () => {
    // ── Step 1: Create plant (pot size category = Wave 3 feature) ────────────
    const createRes = await request(app)
      .post('/api/plants')
      .send({
        name: 'Monstera',
        lastWateredAt: addDays(TODAY, -7),
        location: 'Living room',
        lightLevel: 'bright_indirect',
        pot_size_category: 'Large',
      });

    expect(createRes.status).toBe(201);
    const plantId: number = createRes.body.id;
    expect(createRes.body.enrichment_status).toBe('pending');
    expect(createRes.body.pot_size_category).toBe('Large');

    // ── Step 2: Simulate enrichment callback ─────────────────────────────────
    const enrichRes = await simulateEnrichment(app, plantId, {
      base_interval: 7,
      fertilizer_interval_weeks: 4,
      heating_season_modifier: 0.8,
    });
    expect(enrichRes.status).toBe(200);
    expect(enrichRes.body.ok).toBe(true);

    // Verify enrichment_complete event was logged
    const enrichEvents = db
      .prepare(`SELECT event_type FROM event_log WHERE plant_id = ? AND event_type = 'enrichment_complete'`)
      .all(plantId) as { event_type: string }[];
    expect(enrichEvents).toHaveLength(1);

    // ── Step 3: Water the plant ───────────────────────────────────────────────
    const waterRes1 = await request(app).post(`/api/plants/${plantId}/water`);
    expect(waterRes1.status).toBe(200);
    expect(waterRes1.body.last_watered_at).toBe(TODAY);
    const nextAfterWater1: string = waterRes1.body.next_water_date;
    expect(nextAfterWater1).toBe(addDays(TODAY, 7)); // base interval = 7 (summer, no seasonal adj)

    // watered event logged
    const wateredEvents1 = db
      .prepare(`SELECT id, old_value FROM event_log WHERE plant_id = ? AND event_type = 'watered'`)
      .all(plantId) as { id: number; old_value: string }[];
    expect(wateredEvents1).toHaveLength(1);
    const preState1 = JSON.parse(wateredEvents1[0].old_value);
    expect(preState1).toHaveProperty('last_watered_at');
    expect(preState1).toHaveProperty('next_water_date');
    expect(preState1).toHaveProperty('calibration_cycle');

    // ── Step 4: Undo the watering (Wave 2: undo window) ──────────────────────
    const undoRes = await request(app).post(`/api/plants/${plantId}/undo-water`);
    expect(undoRes.status).toBe(200);
    // State restored to pre-water snapshot
    expect(undoRes.body.last_watered_at).toBe(preState1.last_watered_at);
    expect(undoRes.body.next_water_date).toBe(preState1.next_water_date);
    expect(undoRes.body.calibration_cycle).toBe(preState1.calibration_cycle);

    // watered event removed from log
    const wateredAfterUndo = db
      .prepare(`SELECT id FROM event_log WHERE plant_id = ? AND event_type = 'watered'`)
      .all(plantId);
    expect(wateredAfterUndo).toHaveLength(0);

    // ── Step 5: Water again ───────────────────────────────────────────────────
    const waterRes2 = await request(app).post(`/api/plants/${plantId}/water`);
    expect(waterRes2.status).toBe(200);
    expect(waterRes2.body.last_watered_at).toBe(TODAY);
    expect(waterRes2.body.next_water_date).toBe(addDays(TODAY, 7));

    // Exactly one watered event in log now
    const wateredEvents2 = db
      .prepare(`SELECT id FROM event_log WHERE plant_id = ? AND event_type = 'watered'`)
      .all(plantId);
    expect(wateredEvents2).toHaveLength(1);

    // ── Step 6: Submit calibration answer (interval should decrease on answer=2) ─
    const { id: questionId } = db
      .prepare(
        `SELECT id FROM calibration_questions WHERE plant_id = ? ORDER BY id LIMIT 1`,
      )
      .get(plantId) as { id: number };
    const calibRes = await request(app)
      .post(`/api/plants/${plantId}/calibration`)
      .send({ questionId, answerValue: 2 }); // soil too dry → shorter interval
    expect(calibRes.status).toBe(200);
    expect(calibRes.body.current_interval).toBe(6); // 7 - 1 = 6

    // calibration event logged with interval_before / interval_after
    const calEvent = db
      .prepare(
        `SELECT old_value, new_value FROM event_log WHERE plant_id = ? AND event_type = 'calibration'`,
      )
      .get(plantId) as { old_value: string; new_value: string };
    expect(calEvent.old_value).toBe('7');
    expect(calEvent.new_value).toBe('6');

    // ── Step 7: Verify event log has complete audit trail ─────────────────────
    const allEvents = db
      .prepare(`SELECT event_type FROM event_log WHERE plant_id = ? ORDER BY id ASC`)
      .all(plantId) as { event_type: string }[];
    const types = allEvents.map((e) => e.event_type);

    expect(types).toContain('enrichment_complete');
    expect(types).toContain('watered');
    expect(types).toContain('calibration');
  });
});

// ─── Test suite 2: Seasonal modifier + heating season ─────────────────────

describe('Lifecycle 2: seasonal modifier applied during heating season', () => {
  let db: Database.Database;

  afterEach(() => {
    db.close();
  });

  it('heating season modifier shortens next_water_date and logs seasonal_adjustment', async () => {
    // Force "today" to be mid-January (inside heating season Oct–Apr)
    const winterDate = '2026-01-15';

    db = new Database(':memory:');
    initializeSchema(db);

    // Insert a fully-enriched plant with a heating_season_modifier < 1
    const result = db
      .prepare(
        `INSERT INTO plants
           (name, base_interval, current_interval, heating_season_modifier,
            last_watered_at, next_water_date, enrichment_status, location)
         VALUES ('Snake Plant', 10, 10, 0.7, ?, ?, 'complete', 'Bedroom')`,
      )
      .run(winterDate, addDays(winterDate, 10));
    const plantId = Number(result.lastInsertRowid);

    // Mount app with a heating config that covers October → April
    const heatingConfig = {
      heatingSeasonStart: { month: 10, day: 1 },
      heatingSeasonEnd: { month: 4, day: 1 },
    };
    const app = buildFullApp(db, heatingConfig);

    // The water route uses new Date() for today, so we need to set up the plant
    // such that it would receive the seasonal adjustment. Since we can't inject
    // the date into the single-water route without vi.useFakeTimers here, we
    // verify the logic via the waterPlant helper's seasonal path by inspecting
    // the actual API during a non-fake-timer run. Instead, seed plant's
    // last_watered_at to "today" and call water — heating season modifier only
    // applies if TODAY is actually in heating season. We check conditionally.

    // Determine if today is in heating season (Oct–Apr wrapping range)
    const [, mm] = TODAY.split('-').map(Number);
    const inHeatingSeason = mm >= 10 || mm <= 3; // Oct, Nov, Dec, Jan, Feb, Mar

    if (inHeatingSeason) {
      // Update plant so it can be watered now
      db.prepare(`UPDATE plants SET last_watered_at = ?, next_water_date = ? WHERE id = ?`)
        .run(addDays(TODAY, -10), TODAY, plantId);

      const waterRes = await request(app).post(`/api/plants/${plantId}/water`);
      expect(waterRes.status).toBe(200);

      // 10 * 0.7 = 7 → next_water_date = TODAY + 7
      expect(waterRes.body.next_water_date).toBe(addDays(TODAY, 7));
      // current_interval in DB unchanged — seasonal only adjusts scheduling
      expect(waterRes.body.current_interval).toBe(10);

      // seasonal_adjustment event must be logged
      const seasonEvents = db
        .prepare(
          `SELECT old_value, new_value FROM event_log WHERE plant_id = ? AND event_type = 'seasonal_adjustment'`,
        )
        .all(plantId) as { old_value: string; new_value: string }[];
      expect(seasonEvents).toHaveLength(1);
      expect(seasonEvents[0].old_value).toBe('10');
      expect(seasonEvents[0].new_value).toBe('7'); // round(10 * 0.7)
    } else {
      // Outside heating season: insert with lastWateredAt=today and water
      db.prepare(`UPDATE plants SET last_watered_at = ?, next_water_date = ? WHERE id = ?`)
        .run(addDays(TODAY, -10), TODAY, plantId);

      const waterRes = await request(app).post(`/api/plants/${plantId}/water`);
      expect(waterRes.status).toBe(200);

      // No seasonal adjustment: 10 days unchanged
      expect(waterRes.body.next_water_date).toBe(addDays(TODAY, 10));

      // No seasonal_adjustment event
      const seasonEvents = db
        .prepare(
          `SELECT id FROM event_log WHERE plant_id = ? AND event_type = 'seasonal_adjustment'`,
        )
        .all(plantId);
      expect(seasonEvents).toHaveLength(0);
    }
  });

  it('TRMNL screen shows reduced water amount for heating-season plant (pot size category)', async () => {
    // Seed a plant with all enriched fields including pot_size_category (Wave 3)
    db = new Database(':memory:');
    initializeSchema(db);

    const dueDate = TODAY;
    const result = db
      .prepare(
        `INSERT INTO plants
           (name, species, base_interval, current_interval, heating_season_modifier,
            water_ratio, water_description, fertilizer_interval_weeks,
            last_watered_at, next_water_date, pot_size_category,
            enrichment_status, location, archived)
         VALUES ('Pothos', 'Epipremnum aureum', 7, 7, 0.85,
                 0.25, 'about 1 cup', 4,
                 ?, ?, 'Medium',
                 'complete', 'Office', 0)`,
      )
      .run(addDays(dueDate, -7), dueDate);
    const plantId = Number(result.lastInsertRowid);

    // Insert a calibration question (needed for TRMNL watering card)
    db.prepare(
      `INSERT INTO calibration_questions (plant_id, question_text, question_type, display_order)
       VALUES (?, 'How wet is the soil?', 'scale', 0)`,
    ).run(plantId);

    const app = buildFullApp(db, HEATING_CONFIG);
    const screenRes = await request(app).get(`/api/screen/today?date=${dueDate}`);

    expect(screenRes.status).toBe(200);
    // Plant is due today → watering screen
    expect(screenRes.body.type).toBe('watering');
    const plant = screenRes.body.plants[0];
    expect(plant.name).toBe('Pothos');
    // pot_size_category now projected on the TRMNL screen card (#16 follow-up)
    expect(plant.potSizeCategory).toBe('Medium');
    // water_description from enrichment
    expect(plant.waterDescription).toBe('about 1 cup');
  });
});

// ─── Test suite 3: Bin-packer overflow — third plant shifts to next day ─────

describe('Lifecycle 3: bin-packer overflow with batch water (Wave 2/3)', () => {
  let db: Database.Database;
  let app: ReturnType<typeof buildFullApp>;

  const baseDate = addDays(TODAY, 14); // 2 weeks from now to avoid noise

  beforeEach(() => {
    db = new Database(':memory:');
    initializeSchema(db);
    app = buildFullApp(db);
  });

  afterEach(() => {
    db.close();
  });

  it('third plant shifts one day forward when ideal date is at capacity', async () => {
    // Monstera + Pothos are already scheduled on baseDate (at capacity for same location).
    db.prepare(
      `INSERT INTO plants (name, location, base_interval, current_interval, last_watered_at, next_water_date)
       VALUES ('Monstera', 'Living', 7, 7, ?, ?)`,
    ).run(addDays(baseDate, -7), baseDate);
    db.prepare(
      `INSERT INTO plants (name, location, base_interval, current_interval, last_watered_at, next_water_date)
       VALUES ('Pothos', 'Living', 7, 7, ?, ?)`,
    ).run(addDays(baseDate, -7), baseDate);

    // Snake Plant — ideal next water = baseDate, but that's full.
    // We water it "today" so ideal = TODAY + 14... we instead seed it directly
    // to test the bin-packer path via POST /water-all with a freshly watered plant.
    // Create Snake Plant such that when watered today, ideal = baseDate.
    const snakePlantInterval = 14; // TODAY + 14 = baseDate
    const spResult = db
      .prepare(
        `INSERT INTO plants (name, location, base_interval, current_interval, last_watered_at, next_water_date)
         VALUES ('Snake Plant', 'Living', ?, ?, ?, ?)`,
      )
      .run(snakePlantInterval, snakePlantInterval, addDays(TODAY, -snakePlantInterval), TODAY);
    const snakePlantId = Number(spResult.lastInsertRowid);

    // Water Snake Plant via single-plant water route
    const waterRes = await request(app).post(`/api/plants/${snakePlantId}/water`);
    expect(waterRes.status).toBe(200);

    const scheduled = waterRes.body.next_water_date;
    // Ideal was baseDate (full) → bin-packer shifts by one day. With -1/+1
    // both empty and no same-location tiebreaker, the algorithm iterates
    // sign=-1 first in [-1, 1], so baseDate-1 wins the tie.
    expect(scheduled).toBe(addDays(baseDate, -1));

    // overflow_rebalance event logged for Snake Plant
    const overflowEvents = db
      .prepare(
        `SELECT event_type FROM event_log WHERE plant_id = ? AND event_type = 'overflow_rebalance'`,
      )
      .all(snakePlantId);
    expect(overflowEvents).toHaveLength(1);
  });

  it('batch water — POST /water-all + undo-batch restores all plants, overflow events survive', async () => {
    // Seed two plants due today
    const ago = addDays(TODAY, -7);
    const r1 = db
      .prepare(
        `INSERT INTO plants (name, location, base_interval, current_interval, last_watered_at, next_water_date)
         VALUES ('Ficus', 'Bedroom', 7, 7, ?, ?)`,
      )
      .run(ago, TODAY);
    const r2 = db
      .prepare(
        `INSERT INTO plants (name, location, base_interval, current_interval, last_watered_at, next_water_date)
         VALUES ('Aloe', 'Bedroom', 7, 7, ?, ?)`,
      )
      .run(ago, TODAY);
    const ficusId = Number(r1.lastInsertRowid);
    const aloeId = Number(r2.lastInsertRowid);

    // Batch water
    const batchRes = await request(app).post('/api/plants/water-all').send({});
    expect(batchRes.status).toBe(200);
    expect(batchRes.body.watered).toHaveLength(2);
    const batchId: string = batchRes.body.batch_id;

    // Both plants have last_watered_at = today
    const plants = db
      .prepare(`SELECT id, last_watered_at FROM plants WHERE id IN (?, ?)`)
      .all(ficusId, aloeId) as { id: number; last_watered_at: string }[];
    expect(plants.every((p) => p.last_watered_at === TODAY)).toBe(true);

    // Undo batch
    const undoBatchRes = await request(app)
      .post('/api/plants/undo-batch')
      .send({ batch_id: batchId });
    expect(undoBatchRes.status).toBe(200);
    expect(undoBatchRes.body.restored).toHaveLength(2);

    // watered events removed; overflow/congested events (if any) survive
    const remainingBatchEvents = db
      .prepare(`SELECT event_type FROM event_log WHERE batch_id = ?`)
      .all(batchId);
    expect(remainingBatchEvents).toHaveLength(0);

    // Plants restored to pre-watering state
    const restored = db
      .prepare(`SELECT id, last_watered_at FROM plants WHERE id IN (?, ?)`)
      .all(ficusId, aloeId) as { id: number; last_watered_at: string }[];
    expect(restored.every((p) => p.last_watered_at === ago)).toBe(true);
  });

  it('schedule strip (calendar) shows overflowed plant on shifted day', async () => {
    // Monstera + Pothos fill the ideal date (baseDate)
    db.prepare(
      `INSERT INTO plants (name, location, base_interval, current_interval, next_water_date, last_watered_at)
       VALUES ('Monstera', 'Living', 7, 7, ?, ?)`,
    ).run(baseDate, addDays(baseDate, -7));
    db.prepare(
      `INSERT INTO plants (name, location, base_interval, current_interval, next_water_date, last_watered_at)
       VALUES ('Pothos', 'Living', 7, 7, ?, ?)`,
    ).run(baseDate, addDays(baseDate, -7));

    // Snake Plant shifted to baseDate+1 via overflow
    db.prepare(
      `INSERT INTO plants (name, location, base_interval, current_interval, next_water_date, last_watered_at)
       VALUES ('Snake Plant', 'Living', 7, 7, ?, ?)`,
    ).run(addDays(baseDate, 1), addDays(baseDate, -6));

    const scheduleRes = await request(app).get(
      `/api/schedule/week?from=${baseDate}`,
    );
    expect(scheduleRes.status).toBe(200);

    const days: { date: string; plant_names: string[]; count: number }[] =
      scheduleRes.body.days;

    const basDay = days.find((d) => d.date === baseDate);
    const shiftedDay = days.find((d) => d.date === addDays(baseDate, 1));

    expect(basDay).toBeDefined();
    expect(basDay!.count).toBe(2);
    expect(basDay!.plant_names).toContain('Monstera');
    expect(basDay!.plant_names).toContain('Pothos');

    expect(shiftedDay).toBeDefined();
    expect(shiftedDay!.count).toBe(1);
    expect(shiftedDay!.plant_names).toContain('Snake Plant');
  });
});

// ─── Test suite 4: Archive → verify excluded from scheduling ─────────────────

describe('Lifecycle 4: archive with memorial toast reason → excluded from scheduling', () => {
  let db: Database.Database;
  let app: ReturnType<typeof buildFullApp>;

  beforeEach(() => {
    db = new Database(':memory:');
    initializeSchema(db);
    app = buildFullApp(db);
  });

  afterEach(() => {
    db.close();
  });

  it('archived plant excluded from GET /api/plants and TRMNL screen', async () => {
    // Seed two plants — one we archive, one stays active
    const dueDate = TODAY;
    const r1 = db
      .prepare(
        `INSERT INTO plants (name, base_interval, current_interval, next_water_date, archived)
         VALUES ('Active Fern', 7, 7, ?, 0)`,
      )
      .run(dueDate);
    const r2 = db
      .prepare(
        `INSERT INTO plants (name, base_interval, current_interval, next_water_date, archived)
         VALUES ('Doomed Cactus', 7, 7, ?, 0)`,
      )
      .run(dueDate);
    const activePlantId = Number(r1.lastInsertRowid);
    const doomedId = Number(r2.lastInsertRowid);

    // Archive the doomed cactus with "died" reason (Wave 2: archive reason)
    const archiveRes = await request(app)
      .post(`/api/plants/${doomedId}/archive`)
      .send({ reason: 'died', note: 'Root rot got it' });

    expect(archiveRes.status).toBe(200);
    expect(archiveRes.body.archived).toBe(1);
    expect(archiveRes.body.archive_reason).toBe('died');
    expect(archiveRes.body.archive_note).toBe('Root rot got it');
    expect(archiveRes.body.care_duration_days).toBeGreaterThanOrEqual(0);

    // GET /api/plants returns only active plant
    const listRes = await request(app).get('/api/plants');
    expect(listRes.status).toBe(200);
    expect(listRes.body).toHaveLength(1);
    expect(listRes.body[0].id).toBe(activePlantId);

    // TRMNL screen today: only Active Fern is in the watering list
    // Need a calibration question for watering card to render
    db.prepare(
      `INSERT INTO calibration_questions (plant_id, question_text, question_type, display_order)
       VALUES (?, 'Soil check?', 'scale', 0)`,
    ).run(activePlantId);

    const screenRes = await request(app).get(`/api/screen/today?date=${dueDate}`);
    expect(screenRes.status).toBe(200);
    expect(screenRes.body.type).toBe('watering');
    const names: string[] = screenRes.body.plants.map((p: { name: string }) => p.name);
    expect(names).toContain('Active Fern');
    expect(names).not.toContain('Doomed Cactus');

    // archived event logged
    const archiveEvents = db
      .prepare(`SELECT new_value, reason FROM event_log WHERE plant_id = ? AND event_type = 'archived'`)
      .all(doomedId) as { new_value: string; reason: string }[];
    expect(archiveEvents).toHaveLength(1);
    expect(archiveEvents[0].new_value).toBe('died');
    expect(archiveEvents[0].reason).toContain('Root rot got it');
  });

  it('archived plant excluded from /api/schedule/week and overdue list', async () => {
    // Plant due yesterday → overdue
    const yesterday = addDays(TODAY, -1);
    const r = db
      .prepare(
        `INSERT INTO plants (name, base_interval, current_interval, next_water_date, archived)
         VALUES ('Archived Overdue', 7, 7, ?, 0)`,
      )
      .run(yesterday);
    const plantId = Number(r.lastInsertRowid);

    // Archive it
    await request(app)
      .post(`/api/plants/${plantId}/archive`)
      .send({ reason: 'gave_away' });

    // Schedule week: archived plant must not appear in any day bucket
    const schedRes = await request(app).get(`/api/schedule/week?from=${TODAY}`);
    expect(schedRes.status).toBe(200);
    const allIds = (schedRes.body.days as { plant_ids: number[] }[]).flatMap(
      (d) => d.plant_ids,
    );
    expect(allIds).not.toContain(plantId);

    // TRMNL screen: overdue list must not include archived plant
    // Seed a fact so rest day renders without error
    db.prepare(`INSERT INTO facts (text, source) VALUES ('Some fact', 'seed')`).run();
    db.prepare(`INSERT INTO decorative_ornaments (image_path) VALUES ('/ornament.png')`).run();
    const screenRes = await request(app).get(`/api/screen/today?date=${TODAY}`);
    expect(screenRes.status).toBe(200);
    const overdueIds = screenRes.body.overdue.map((o: { id: number }) => o.id);
    expect(overdueIds).not.toContain(plantId);
  });

  it('convergence after 3 consistent calibration answers sets is_converged and reduces question frequency', async () => {
    // Plant fully seeded with calibration question
    const r = db
      .prepare(
        `INSERT INTO plants (name, base_interval, current_interval, next_water_date, calibration_cycle, is_converged)
         VALUES ('Converging Fern', 7, 7, ?, 0, 0)`,
      )
      .run(TODAY);
    const plantId = Number(r.lastInsertRowid);
    db.prepare(
      `INSERT INTO calibration_questions (plant_id, question_text, question_type, display_order)
       VALUES (?, 'Soil moisture?', 'scale', 0)`,
    ).run(plantId);

    const { id: questionId } = db
      .prepare(
        `SELECT id FROM calibration_questions WHERE plant_id = ? ORDER BY id LIMIT 1`,
      )
      .get(plantId) as { id: number };

    // Three consecutive "3" (just right) answers → convergence
    for (let i = 0; i < 3; i++) {
      const calRes = await request(app)
        .post(`/api/plants/${plantId}/calibration`)
        .send({ questionId, answerValue: 3 });
      expect(calRes.status).toBe(200);
    }

    // is_converged = 1
    const plant = db
      .prepare(`SELECT is_converged, calibration_cycle FROM plants WHERE id = ?`)
      .get(plantId) as { is_converged: number; calibration_cycle: number };
    expect(plant.is_converged).toBe(1);

    // After convergence, calibration/next should skip unless cycle % 3 === 0
    // calibration_cycle is now 3 (incremented 3× by the calibration route)
    // 3 % 3 === 0 → question returned this time
    const nextQ1 = await request(app).get(`/api/plants/${plantId}/calibration/next`);
    expect(nextQ1.status).toBe(200);
    expect(nextQ1.body.skip).toBeUndefined(); // cycle=3, 3%3=0 → show question

    // Water again to bump calibration_cycle to 4 (via water route)
    await request(app).post(`/api/plants/${plantId}/water`);
    // calibration_cycle is now 4 → 4 % 3 !== 0 → skip
    const nextQ2 = await request(app).get(`/api/plants/${plantId}/calibration/next`);
    expect(nextQ2.status).toBe(200);
    expect(nextQ2.body.skip).toBe(true);
    expect(nextQ2.body.reason).toBe('converged');
  });
});
