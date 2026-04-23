import { Router, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import type Database from 'better-sqlite3';
import { calculateNextWaterDate, calculateRepotAdjustment } from '../scheduling/engine.js';
import { logEvent, getEventsForPlant, logScheduleEvents } from '../database/event-log.js';
import { enrichPlantWithClaude } from '../enrichment/claude-enrich.js';
import { getSeasonalAdjustedInterval } from '../scheduling/seasonal.js';
import { scheduleNextWater, type ScheduledPlant, type ScheduleResult } from '../scheduling/bin-packer.js';
import type { Config } from '../config.js';

type HeatingSeasonConfig = Pick<Config, 'heatingSeasonStart' | 'heatingSeasonEnd'>;

export interface WaterPlantOptions {
  batchId?: string;
  today?: string;
}

export interface WaterPlantResult {
  plant: Record<string, unknown>;
  batchId: string;
  scheduled: ScheduleResult;
  seasonalApplied: boolean;
}

/**
 * Core water-a-plant operation shared by POST /:id/water and POST /water-all.
 *
 * Captures pre-state JSON for undo, applies seasonal adjustment when configured,
 * funnels the ideal date through the bin-packer, logs the watered event + any
 * seasonal_adjustment event with the shared batchId. Overflow/congested events
 * logged by logScheduleEvents are intentionally left OUT of the batch (they
 * aren't part of the undo flow — see Task 9 caveat 3).
 */
export function waterPlant(
  db: Database.Database,
  plantId: number,
  heatingConfig: HeatingSeasonConfig | undefined,
  options: WaterPlantOptions = {},
): WaterPlantResult {
  const plant = db.prepare(`SELECT * FROM plants WHERE id = ?`).get(plantId) as
    | Record<string, unknown>
    | undefined;
  if (!plant) throw new Error(`Plant ${plantId} not found`);

  const today = options.today ?? new Date().toISOString().split('T')[0];
  const batchId = options.batchId ?? randomUUID();
  const currentInterval = plant.current_interval as number;
  const modifier = plant.heating_season_modifier as number | null;

  const effectiveInterval = heatingConfig
    ? getSeasonalAdjustedInterval(currentInterval, modifier, today, heatingConfig)
    : currentInterval;

  const idealDate = calculateNextWaterDate(today, effectiveInterval);
  const existing = db.prepare(
    `SELECT id, location, next_water_date as nextWaterDate
       FROM plants
       WHERE archived = 0 AND id != ? AND next_water_date IS NOT NULL`
  ).all(plantId) as ScheduledPlant[];
  const scheduled = scheduleNextWater(idealDate, (plant.location as string) ?? '', existing);

  const calibrationCycle = ((plant.calibration_cycle as number) ?? 0) + 1;
  const preState = JSON.stringify({
    last_watered_at: plant.last_watered_at ?? null,
    next_water_date: plant.next_water_date ?? null,
    calibration_cycle: plant.calibration_cycle ?? 0,
  });

  db.prepare(
    `UPDATE plants SET
       last_watered_at   = ?,
       next_water_date   = ?,
       calibration_cycle = ?,
       updated_at        = datetime('now')
     WHERE id = ?`
  ).run(today, scheduled.date, calibrationCycle, plantId);

  logEvent(db, {
    plantId,
    eventType: 'watered',
    oldValue: preState,
    newValue: today,
    reason: 'Plant watered',
    batchId,
  });

  const seasonalApplied = effectiveInterval !== currentInterval;
  if (seasonalApplied) {
    logEvent(db, {
      plantId,
      eventType: 'seasonal_adjustment',
      oldValue: String(currentInterval),
      newValue: String(effectiveInterval),
      reason: `Heating season active; interval ${currentInterval} → ${effectiveInterval} (×${modifier})`,
      batchId,
    });
  }

  logScheduleEvents(db, plantId, scheduled);

  const updated = db.prepare(`SELECT * FROM plants WHERE id = ?`).get(plantId) as Record<
    string,
    unknown
  >;
  return { plant: updated, batchId, scheduled, seasonalApplied };
}

const VALID_POT_SIZE_CATEGORIES = [
  'Extra Small',
  'Small',
  'Medium',
  'Large',
  'Extra Large',
  'Other',
] as const;

const VALID_ORIGIN_TYPES = ['purchased', 'received', 'seedling', 'unknown'] as const;

export function createPlantsRouter(
  db: Database.Database,
  heatingConfig?: HeatingSeasonConfig,
): Router {
  const router = Router();

  // GET /api/plants — list active plants ordered by next_water_date ASC
  router.get('/', (_req: Request, res: Response) => {
    const plants = db.prepare(
      `SELECT * FROM plants WHERE archived = 0 ORDER BY next_water_date ASC`
    ).all();
    res.json(plants);
  });

  // GET /api/plants/archived — list archived plants, newest-archived first.
  // MUST be declared BEFORE '/:id' so Express doesn't match "archived" as an id.
  router.get('/archived', (_req: Request, res: Response) => {
    const plants = db.prepare(
      `SELECT * FROM plants WHERE archived = 1 ORDER BY archived_at DESC, id DESC`
    ).all();
    res.json(plants);
  });

  // GET /api/plants/:id — single plant with active conditions count
  router.get('/:id', (req: Request, res: Response) => {
    const plant = db.prepare(
      `SELECT p.*,
              (SELECT COUNT(*) FROM plant_conditions
               WHERE plant_id = p.id AND is_active = 1) AS active_conditions_count,
              (SELECT name FROM plants m
               WHERE m.id = p.mother_plant_id) AS mother_plant_name
       FROM plants p
       WHERE p.id = ?`
    ).get(req.params.id) as Record<string, unknown> | undefined;

    if (!plant) {
      res.status(404).json({ error: 'Plant not found' });
      return;
    }
    res.json(plant);
  });

  // POST /api/plants — create a new plant
  router.post('/', (req: Request, res: Response) => {
    const { name, plantSize, identifier, location, lightLevel, lastWateredAt, notes } = req.body;
    // Accept both camelCase (existing API) and snake_case (client payloads / dropdown form)
    const potSizeCm = req.body.potSizeCm ?? req.body.pot_size_cm;
    const potSizeCategory = req.body.pot_size_category;
    const originType = req.body.origin_type ?? req.body.originType;
    const originSource = req.body.origin_source ?? req.body.originSource;
    const motherPlantId = req.body.mother_plant_id ?? req.body.motherPlantId;

    if (!name || !lastWateredAt) {
      res.status(400).json({ error: 'name and lastWateredAt are required' });
      return;
    }

    if (
      potSizeCategory != null &&
      (typeof potSizeCategory !== 'string' ||
        !(VALID_POT_SIZE_CATEGORIES as readonly string[]).includes(potSizeCategory))
    ) {
      res.status(400).json({ error: 'Invalid pot_size_category' });
      return;
    }

    if (
      originType != null &&
      (typeof originType !== 'string' ||
        !(VALID_ORIGIN_TYPES as readonly string[]).includes(originType))
    ) {
      res.status(400).json({ error: 'Invalid origin_type' });
      return;
    }

    const currentInterval = 7;
    const nextWaterDate = calculateNextWaterDate(lastWateredAt, currentInterval);

    const result = db.prepare(
      `INSERT INTO plants
         (name, pot_size_cm, pot_size_category, plant_size, identifier, location, light_level, base_interval, current_interval,
          last_watered_at, next_water_date, enrichment_status, notes, origin_type, origin_source, mother_plant_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?)`
    ).run(
      name,
      potSizeCm ?? null,
      potSizeCategory ?? null,
      plantSize ?? null,
      identifier ?? null,
      location ?? null,
      lightLevel ?? null,
      currentInterval,
      currentInterval,
      lastWateredAt,
      nextWaterDate,
      notes ?? null,
      originType ?? null,
      originSource ?? null,
      motherPlantId ?? null,
    );

    const plant = db.prepare(`SELECT * FROM plants WHERE id = ?`).get(result.lastInsertRowid) as Record<string, unknown>;
    res.status(201).json(plant);

    // Fire Claude enrichment in the background (don't block the response)
    const plantId = result.lastInsertRowid as number;
    enrichPlantWithClaude(db, plantId, {
      name,
      potSizeCm: potSizeCm ?? null,
      plantSize: plantSize ?? null,
      location: location ?? null,
      lightLevel: lightLevel ?? null,
    }).catch(() => { /* logged inside enrichPlantWithClaude */ });
  });

  // GET /api/plants/:id/enrichment-status — poll for enrichment completion
  router.get('/:id/enrichment-status', (req: Request, res: Response) => {
    const plant = db.prepare(
      `SELECT id, enrichment_status, species, base_interval, water_description FROM plants WHERE id = ?`
    ).get(req.params.id) as Record<string, unknown> | undefined;

    if (!plant) {
      res.status(404).json({ error: 'Plant not found' });
      return;
    }
    res.json(plant);
  });

  // PUT /api/plants/:id — update plant fields
  router.put('/:id', (req: Request, res: Response) => {
    const plantId = Number(req.params.id);

    const existing = db.prepare(`SELECT * FROM plants WHERE id = ?`).get(plantId) as
      | Record<string, unknown>
      | undefined;

    if (!existing) {
      res.status(404).json({ error: 'Plant not found' });
      return;
    }

    const { name, plantSize, identifier, location, lightLevel, notes } = req.body;
    // Accept both camelCase and snake_case for pot_size_cm (client sends snake_case)
    const potSizeCm = req.body.potSizeCm ?? req.body.pot_size_cm;
    const potSizeCategory = req.body.pot_size_category;
    const originType = req.body.origin_type ?? req.body.originType;
    const originSource = req.body.origin_source ?? req.body.originSource;
    const motherPlantId = req.body.mother_plant_id ?? req.body.motherPlantId;

    if (
      potSizeCategory != null &&
      (typeof potSizeCategory !== 'string' ||
        !(VALID_POT_SIZE_CATEGORIES as readonly string[]).includes(potSizeCategory))
    ) {
      res.status(400).json({ error: 'Invalid pot_size_category' });
      return;
    }

    if (
      originType != null &&
      (typeof originType !== 'string' ||
        !(VALID_ORIGIN_TYPES as readonly string[]).includes(originType))
    ) {
      res.status(400).json({ error: 'Invalid origin_type' });
      return;
    }

    let newInterval = existing.current_interval as number;
    let isConverged = existing.is_converged as number;
    let nextWaterDate = existing.next_water_date as string;

    const oldPotSizeCm = existing.pot_size_cm as number | null;
    const potSizeChanged =
      potSizeCm !== undefined &&
      oldPotSizeCm !== null &&
      oldPotSizeCm !== undefined &&
      potSizeCm !== oldPotSizeCm;

    let scheduledOnPut: ReturnType<typeof scheduleNextWater> | null = null;

    if (potSizeChanged && oldPotSizeCm) {
      newInterval = calculateRepotAdjustment(newInterval, oldPotSizeCm, potSizeCm);
      isConverged = 0;

      // Recalculate next_water_date from last_watered_at if available,
      // funneling through scheduleNextWater so we get overflow/congested metadata.
      const lastWatered = existing.last_watered_at as string | null;
      if (lastWatered) {
        const idealDate = calculateNextWaterDate(lastWatered, newInterval);
        const activeSchedule = db.prepare(
          `SELECT id, location, next_water_date as nextWaterDate
             FROM plants
             WHERE archived = 0 AND id != ? AND next_water_date IS NOT NULL`
        ).all(plantId) as ScheduledPlant[];
        scheduledOnPut = scheduleNextWater(
          idealDate,
          (existing.location as string) ?? '',
          activeSchedule,
        );
        nextWaterDate = scheduledOnPut.date;
      }

      logEvent(db, {
        plantId,
        eventType: 'repot',
        oldValue: String(oldPotSizeCm),
        newValue: String(potSizeCm),
        reason: `Pot size changed from ${oldPotSizeCm}cm to ${potSizeCm}cm`,
      });
    }

    db.prepare(
      `UPDATE plants SET
         name              = COALESCE(?, name),
         pot_size_cm       = COALESCE(?, pot_size_cm),
         pot_size_category = COALESCE(?, pot_size_category),
         plant_size        = COALESCE(?, plant_size),
         identifier        = CASE WHEN ? = 1 THEN ? ELSE identifier END,
         location          = COALESCE(?, location),
         light_level       = COALESCE(?, light_level),
         notes             = COALESCE(?, notes),
         origin_type       = COALESCE(?, origin_type),
         origin_source     = CASE WHEN ? = 1 THEN ? ELSE origin_source END,
         mother_plant_id   = CASE WHEN ? = 1 THEN ? ELSE mother_plant_id END,
         current_interval  = ?,
         is_converged      = ?,
         next_water_date   = ?,
         updated_at        = datetime('now')
       WHERE id = ?`
    ).run(
      name ?? null,
      potSizeCm ?? null,
      potSizeCategory ?? null,
      plantSize ?? null,
      identifier !== undefined ? 1 : 0,
      identifier ?? null,
      location ?? null,
      lightLevel ?? null,
      notes ?? null,
      originType ?? null,
      originSource !== undefined ? 1 : 0,
      originSource ?? null,
      motherPlantId !== undefined ? 1 : 0,
      motherPlantId ?? null,
      newInterval,
      isConverged,
      nextWaterDate,
      plantId
    );

    if (scheduledOnPut) {
      logScheduleEvents(db, plantId, scheduledOnPut);
    }

    const updated = db.prepare(`SELECT * FROM plants WHERE id = ?`).get(plantId);
    res.json(updated);
  });

  // POST /api/plants/water-all — batch water plants (all due or a given id list).
  // IMPORTANT: must be declared BEFORE '/:id/water' routes so Express doesn't match
  // 'water-all' as :id.
  router.post('/water-all', (req: Request, res: Response) => {
    const today = new Date().toISOString().split('T')[0];
    const requestedIds = Array.isArray(req.body?.plant_ids)
      ? (req.body.plant_ids as number[])
      : null;

    let plantIds: number[];
    if (requestedIds) {
      if (requestedIds.length === 0) {
        res.json({ batch_id: randomUUID(), watered: [] });
        return;
      }
      const placeholders = requestedIds.map(() => '?').join(',');
      const found = db
        .prepare(
          `SELECT id FROM plants WHERE archived = 0 AND id IN (${placeholders})`,
        )
        .all(...requestedIds) as { id: number }[];
      if (found.length !== requestedIds.length) {
        res.status(404).json({ error: 'Unknown or archived plant id(s)' });
        return;
      }
      plantIds = requestedIds;
    } else {
      plantIds = (
        db
          .prepare(
            `SELECT id FROM plants WHERE archived = 0 AND next_water_date <= ?`,
          )
          .all(today) as { id: number }[]
      ).map((r) => r.id);
    }

    const batchId = randomUUID();
    const watered: unknown[] = [];
    for (const pid of plantIds) {
      const result = waterPlant(db, pid, heatingConfig, { batchId, today });
      watered.push(result.plant);
    }
    res.json({ batch_id: batchId, watered });
  });

  // POST /api/plants/undo-batch — restore all plants in a batch and delete its events.
  router.post('/undo-batch', (req: Request, res: Response) => {
    const batchId = req.body?.batch_id;
    if (typeof batchId !== 'string' || !batchId) {
      res.status(400).json({ error: 'batch_id required' });
      return;
    }

    const events = db
      .prepare(
        `SELECT id, plant_id, old_value FROM event_log
         WHERE batch_id = ? AND event_type = 'watered'`,
      )
      .all(batchId) as { id: number; plant_id: number; old_value: string | null }[];

    if (events.length === 0) {
      res.status(404).json({ error: 'No events for batch_id' });
      return;
    }

    const restored: unknown[] = [];
    const tx = db.transaction(() => {
      for (const ev of events) {
        if (!ev.old_value) continue;
        const pre = JSON.parse(ev.old_value) as {
          last_watered_at: string | null;
          next_water_date: string | null;
          calibration_cycle: number;
        };
        db.prepare(
          `UPDATE plants SET
             last_watered_at   = ?,
             next_water_date   = ?,
             calibration_cycle = ?,
             updated_at        = datetime('now')
           WHERE id = ?`,
        ).run(pre.last_watered_at, pre.next_water_date, pre.calibration_cycle, ev.plant_id);

        const p = db.prepare(`SELECT * FROM plants WHERE id = ?`).get(ev.plant_id);
        restored.push(p);
      }
      // Delete ALL events tied to this batch (watered + seasonal_adjustment).
      // Overflow/congested events aren't part of the batch (see waterPlant).
      db.prepare(`DELETE FROM event_log WHERE batch_id = ?`).run(batchId);
    });
    tx();

    res.json({ restored });
  });

  // POST /api/plants/:id/water — mark as watered (single-plant path).
  // Shares the exact same logic as /water-all via the waterPlant helper.
  router.post('/:id/water', (req: Request, res: Response) => {
    const plantId = Number(req.params.id);

    const plant = db.prepare(`SELECT id FROM plants WHERE id = ?`).get(plantId);
    if (!plant) {
      res.status(404).json({ error: 'Plant not found' });
      return;
    }

    const result = waterPlant(db, plantId, heatingConfig);
    res.json(result.plant);
  });

  // POST /api/plants/:id/undo-water — revert the last watering + remove the event
  router.post('/:id/undo-water', (req: Request, res: Response) => {
    const plantId = Number(req.params.id);

    const plant = db.prepare(`SELECT id FROM plants WHERE id = ?`).get(plantId);
    if (!plant) {
      res.status(404).json({ error: 'Plant not found' });
      return;
    }

    const lastWatered = db.prepare(
      `SELECT id, old_value FROM event_log
       WHERE plant_id = ? AND event_type = 'watered'
       ORDER BY created_at DESC, id DESC LIMIT 1`
    ).get(plantId) as { id: number; old_value: string | null } | undefined;

    if (!lastWatered || !lastWatered.old_value) {
      res.status(400).json({ error: 'No undoable watering found' });
      return;
    }

    let preState: { last_watered_at: string | null; next_water_date: string | null; calibration_cycle: number };
    try {
      preState = JSON.parse(lastWatered.old_value);
    } catch {
      res.status(400).json({ error: 'Watering event has no restorable state' });
      return;
    }

    db.prepare(
      `UPDATE plants SET
         last_watered_at   = ?,
         next_water_date   = ?,
         calibration_cycle = ?,
         updated_at        = datetime('now')
       WHERE id = ?`
    ).run(
      preState.last_watered_at,
      preState.next_water_date,
      preState.calibration_cycle,
      plantId,
    );

    db.prepare(`DELETE FROM event_log WHERE id = ?`).run(lastWatered.id);

    const updated = db.prepare(`SELECT * FROM plants WHERE id = ?`).get(plantId);
    res.json(updated);
  });

  // GET /api/plants/:id/events — paginated event history (newest first)
  router.get('/:id/events', (req: Request, res: Response) => {
    const plantId = Number(req.params.id);

    const plant = db.prepare(`SELECT id FROM plants WHERE id = ?`).get(plantId);
    if (!plant) {
      res.status(404).json({ error: 'Plant not found' });
      return;
    }

    const rawLimit = Number(req.query.limit);
    const limit = Number.isFinite(rawLimit) && rawLimit > 0
      ? Math.min(Math.floor(rawLimit), 200)
      : 50;

    const events = getEventsForPlant(db, plantId, limit);
    res.json(events);
  });

  // POST /api/plants/:id/archive — archive a plant with reason + optional note
  router.post('/:id/archive', (req: Request, res: Response) => {
    const plantId = Number(req.params.id);

    const plant = db.prepare(`SELECT * FROM plants WHERE id = ?`).get(plantId) as
      | Record<string, unknown>
      | undefined;

    if (!plant) {
      res.status(404).json({ error: 'Plant not found' });
      return;
    }

    const { reason, note } = req.body as { reason?: unknown; note?: unknown };
    const VALID_REASONS = ['died', 'gave_away', 'moved', 'other'] as const;
    if (typeof reason !== 'string' || !VALID_REASONS.includes(reason as (typeof VALID_REASONS)[number])) {
      res.status(400).json({
        error: 'reason is required and must be one of: died, gave_away, moved, other',
      });
      return;
    }
    const archiveNote = typeof note === 'string' && note.trim().length > 0 ? note.trim() : null;

    db.prepare(
      `UPDATE plants SET
         archived       = 1,
         archived_at    = datetime('now'),
         archive_reason = ?,
         archive_note   = ?,
         updated_at     = datetime('now')
       WHERE id = ?`
    ).run(reason, archiveNote, plantId);

    // Soft-disable species-specific facts when this was the last plant of the species.
    const species = plant.species as string | null;
    if (species) {
      const remainingOfSpecies = db.prepare(
        `SELECT COUNT(*) AS n FROM plants WHERE species = ? AND archived = 0 AND id != ?`
      ).get(species, plantId) as { n: number };
      if (remainingOfSpecies.n === 0) {
        db.prepare(
          `UPDATE facts SET is_disabled = 1 WHERE plant_id = ?`
        ).run(plantId);
      }
    }

    logEvent(db, {
      plantId,
      eventType: 'archived',
      newValue: reason,
      reason: archiveNote
        ? `Plant archived (${reason}): ${archiveNote}`
        : `Plant archived (${reason})`,
    });

    const updated = db.prepare(`SELECT * FROM plants WHERE id = ?`).get(plantId) as Record<
      string,
      unknown
    >;

    // Memorial: days between created_at and archived_at
    const createdAt = updated.created_at as string;
    const archivedAt = updated.archived_at as string;
    const careDurationDays = Math.max(
      0,
      Math.floor(
        (new Date(archivedAt).getTime() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24)
      )
    );

    res.json({ ...updated, care_duration_days: careDurationDays });
  });

  return router;
}
