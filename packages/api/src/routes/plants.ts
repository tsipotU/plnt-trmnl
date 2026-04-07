import { Router, Request, Response } from 'express';
import type Database from 'better-sqlite3';
import { calculateNextWaterDate, calculateRepotAdjustment } from '../scheduling/engine.js';
import { logEvent } from '../database/event-log.js';

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
    const { name, potSizeCm, plantSize, location, lightLevel, lastWateredAt, notes } = req.body;

    if (!name || !lastWateredAt) {
      res.status(400).json({ error: 'name and lastWateredAt are required' });
      return;
    }

    const currentInterval = 7;
    const nextWaterDate = calculateNextWaterDate(lastWateredAt, currentInterval);

    const result = db.prepare(
      `INSERT INTO plants
         (name, pot_size_cm, plant_size, location, light_level, base_interval, current_interval,
          last_watered_at, next_water_date, enrichment_status, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`
    ).run(
      name,
      potSizeCm ?? null,
      plantSize ?? null,
      location ?? null,
      lightLevel ?? null,
      currentInterval,
      currentInterval,
      lastWateredAt,
      nextWaterDate,
      notes ?? null
    );

    const plant = db.prepare(`SELECT * FROM plants WHERE id = ?`).get(result.lastInsertRowid);
    res.status(201).json(plant);
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

    const { name, potSizeCm, plantSize, location, lightLevel, notes } = req.body;

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
      newValue: today,
      reason: 'Plant watered',
    });

    const updated = db.prepare(`SELECT * FROM plants WHERE id = ?`).get(plantId);
    res.json(updated);
  });

  // POST /api/plants/:id/archive — archive a plant
  router.post('/:id/archive', (req: Request, res: Response) => {
    const plantId = Number(req.params.id);

    const plant = db.prepare(`SELECT * FROM plants WHERE id = ?`).get(plantId) as
      | Record<string, unknown>
      | undefined;

    if (!plant) {
      res.status(404).json({ error: 'Plant not found' });
      return;
    }

    db.prepare(
      `UPDATE plants SET
         archived    = 1,
         archived_at = datetime('now'),
         updated_at  = datetime('now')
       WHERE id = ?`
    ).run(plantId);

    logEvent(db, {
      plantId,
      eventType: 'archived',
      reason: 'Plant archived',
    });

    const updated = db.prepare(`SELECT * FROM plants WHERE id = ?`).get(plantId);
    res.json(updated);
  });

  return router;
}
