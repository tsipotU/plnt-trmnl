import { Router, Request, Response } from 'express';
import type Database from 'better-sqlite3';
import { calculateNextWaterDate, calculateRepotAdjustment } from '../scheduling/engine.js';
import { logEvent, getEventsForPlant } from '../database/event-log.js';
import { enrichPlantWithClaude } from '../enrichment/claude-enrich.js';

export function createPlantsRouter(db: Database.Database): Router {
  const router = Router();

  // GET /api/plants — list active plants ordered by next_water_date ASC
  router.get('/', (_req: Request, res: Response) => {
    const plants = db.prepare(
      `SELECT * FROM plants WHERE archived = 0 ORDER BY next_water_date ASC`
    ).all();
    res.json(plants);
  });

  // GET /api/plants/:id — single plant with active conditions count
  router.get('/:id', (req: Request, res: Response) => {
    const plant = db.prepare(
      `SELECT p.*,
              (SELECT COUNT(*) FROM plant_conditions
               WHERE plant_id = p.id AND is_active = 1) AS active_conditions_count
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
    const { name, potSizeCm, plantSize, identifier, location, lightLevel, lastWateredAt, notes } = req.body;

    if (!name || !lastWateredAt) {
      res.status(400).json({ error: 'name and lastWateredAt are required' });
      return;
    }

    const currentInterval = 7;
    const nextWaterDate = calculateNextWaterDate(lastWateredAt, currentInterval);

    const result = db.prepare(
      `INSERT INTO plants
         (name, pot_size_cm, plant_size, identifier, location, light_level, base_interval, current_interval,
          last_watered_at, next_water_date, enrichment_status, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`
    ).run(
      name,
      potSizeCm ?? null,
      plantSize ?? null,
      identifier ?? null,
      location ?? null,
      lightLevel ?? null,
      currentInterval,
      currentInterval,
      lastWateredAt,
      nextWaterDate,
      notes ?? null
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

    const { name, potSizeCm, plantSize, identifier, location, lightLevel, notes } = req.body;

    let newInterval = existing.current_interval as number;
    let isConverged = existing.is_converged as number;
    let nextWaterDate = existing.next_water_date as string;

    const oldPotSizeCm = existing.pot_size_cm as number | null;
    const potSizeChanged =
      potSizeCm !== undefined &&
      oldPotSizeCm !== null &&
      oldPotSizeCm !== undefined &&
      potSizeCm !== oldPotSizeCm;

    if (potSizeChanged && oldPotSizeCm) {
      newInterval = calculateRepotAdjustment(newInterval, oldPotSizeCm, potSizeCm);
      isConverged = 0;

      // Recalculate next_water_date from last_watered_at if available
      const lastWatered = existing.last_watered_at as string | null;
      if (lastWatered) {
        nextWaterDate = calculateNextWaterDate(lastWatered, newInterval);
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
         plant_size        = COALESCE(?, plant_size),
         identifier        = CASE WHEN ? = 1 THEN ? ELSE identifier END,
         location          = COALESCE(?, location),
         light_level       = COALESCE(?, light_level),
         notes             = COALESCE(?, notes),
         current_interval  = ?,
         is_converged      = ?,
         next_water_date   = ?,
         updated_at        = datetime('now')
       WHERE id = ?`
    ).run(
      name ?? null,
      potSizeCm ?? null,
      plantSize ?? null,
      identifier !== undefined ? 1 : 0,
      identifier ?? null,
      location ?? null,
      lightLevel ?? null,
      notes ?? null,
      newInterval,
      isConverged,
      nextWaterDate,
      plantId
    );

    const updated = db.prepare(`SELECT * FROM plants WHERE id = ?`).get(plantId);
    res.json(updated);
  });

  // POST /api/plants/:id/water — mark as watered
  router.post('/:id/water', (req: Request, res: Response) => {
    const plantId = Number(req.params.id);

    const plant = db.prepare(`SELECT * FROM plants WHERE id = ?`).get(plantId) as
      | Record<string, unknown>
      | undefined;

    if (!plant) {
      res.status(404).json({ error: 'Plant not found' });
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    const currentInterval = plant.current_interval as number;
    const nextWaterDate = calculateNextWaterDate(today, currentInterval);
    const calibrationCycle = (plant.calibration_cycle as number) + 1;

    // Capture pre-state so the event can be undone.
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
    ).run(today, nextWaterDate, calibrationCycle, plantId);

    logEvent(db, {
      plantId,
      eventType: 'watered',
      oldValue: preState,
      newValue: today,
      reason: 'Plant watered',
    });

    const updated = db.prepare(`SELECT * FROM plants WHERE id = ?`).get(plantId);
    res.json(updated);
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
