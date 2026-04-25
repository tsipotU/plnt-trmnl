import { Router, Request, Response } from 'express';
import type Database from 'better-sqlite3';
import { logEvent } from '../database/event-log.js';

export function createConditionsRouter(db: Database.Database): Router {
  const router = Router();

  // GET /api/plants/:id/conditions — list conditions (active first, then resolved)
  router.get('/plants/:id/conditions', (req: Request, res: Response) => {
    const plantId = Number(req.params.id);

    const plant = db.prepare(`SELECT id FROM plants WHERE id = ?`).get(plantId);
    if (!plant) {
      res.status(404).json({ error: 'Plant not found' });
      return;
    }

    const conditions = db.prepare(
      `SELECT * FROM plant_conditions
       WHERE plant_id = ?
       ORDER BY is_active DESC, created_at DESC`
    ).all(plantId);

    res.json(conditions);
  });

  // GET /api/conditions?care_update=pending — list conditions awaiting AI care suggestion
  router.get('/conditions', (req: Request, res: Response) => {
    const filter = typeof req.query.care_update === 'string' ? req.query.care_update : null;
    if (filter !== 'pending') {
      res.status(400).json({ error: "Required query: care_update=pending" });
      return;
    }
    const rows = db.prepare(
      `SELECT pc.*, p.name as plant_name
         FROM plant_conditions pc
         JOIN plants p ON p.id = pc.plant_id
         WHERE pc.care_update_status = 'pending'
         ORDER BY pc.created_at ASC`
    ).all();
    res.json(rows);
  });

  // POST /api/conditions/:id/care-update — receive AI-suggested care adjustment
  router.post('/conditions/:id/care-update', (req: Request, res: Response) => {
    const conditionId = Number(req.params.id);
    const { interval_delta_days, light_preference, rationale } = req.body ?? {};

    if (typeof interval_delta_days !== 'number' || typeof rationale !== 'string') {
      res.status(400).json({ error: 'interval_delta_days (number) and rationale (string) are required' });
      return;
    }
    if (light_preference !== undefined && typeof light_preference !== 'string') {
      res.status(400).json({ error: 'light_preference must be a string when provided' });
      return;
    }

    const condition = db.prepare(`SELECT * FROM plant_conditions WHERE id = ?`).get(conditionId) as { id: number; plant_id: number; care_update_status: string } | undefined;
    if (!condition) {
      res.status(404).json({ error: 'Condition not found' });
      return;
    }
    if (condition.care_update_status === 'complete') {
      res.status(409).json({ error: 'Care update already applied' });
      return;
    }

    const plant = db.prepare(`SELECT current_interval, light_level FROM plants WHERE id = ?`).get(condition.plant_id) as { current_interval: number; light_level: string | null } | undefined;
    if (!plant) {
      res.status(500).json({ error: 'Plant data inconsistency' });
      return;
    }
    const newInterval = Math.max(1, plant.current_interval + interval_delta_days);

    db.prepare(`UPDATE plants SET current_interval = ?, light_level = COALESCE(?, light_level), updated_at = datetime('now') WHERE id = ?`)
      .run(newInterval, light_preference ?? null, condition.plant_id);

    db.prepare(`UPDATE plant_conditions SET care_update_status = 'complete' WHERE id = ?`).run(conditionId);

    logEvent(db, {
      plantId: condition.plant_id,
      eventType: 'care_updated',
      newValue: String(newInterval),
      reason: rationale,
    });

    res.json({ ok: true, condition_id: conditionId, new_interval: newInterval });
  });

  // POST /api/plants/:id/conditions — create a condition
  router.post('/plants/:id/conditions', (req: Request, res: Response) => {
    const plantId = Number(req.params.id);

    const plant = db.prepare(`SELECT id FROM plants WHERE id = ?`).get(plantId);
    if (!plant) {
      res.status(404).json({ error: 'Plant not found' });
      return;
    }

    const { conditionName, symptoms, remedy, severity } = req.body;

    if (!conditionName) {
      res.status(400).json({ error: 'conditionName is required' });
      return;
    }

    const result = db.prepare(
      `INSERT INTO plant_conditions
         (plant_id, condition_name, symptoms, remedy, severity, detected_via, is_active, care_update_status)
       VALUES (?, ?, ?, ?, ?, 'manual', 1, 'pending')`
    ).run(
      plantId,
      conditionName,
      symptoms ?? null,
      remedy ?? null,
      severity ?? 'info'
    );

    logEvent(db, {
      plantId,
      eventType: 'condition_detected',
      newValue: conditionName,
      reason: `Condition flagged: ${conditionName}`,
    });

    const condition = db.prepare(
      `SELECT * FROM plant_conditions WHERE id = ?`
    ).get(result.lastInsertRowid);

    res.status(201).json(condition);
  });

  // POST /api/conditions/:id/resolve — resolve a condition
  router.post('/conditions/:id/resolve', (req: Request, res: Response) => {
    const conditionId = Number(req.params.id);

    const condition = db.prepare(
      `SELECT * FROM plant_conditions WHERE id = ?`
    ).get(conditionId) as Record<string, unknown> | undefined;

    if (!condition) {
      res.status(404).json({ error: 'Condition not found' });
      return;
    }

    db.prepare(
      `UPDATE plant_conditions
       SET is_active = 0, resolved_at = datetime('now')
       WHERE id = ?`
    ).run(conditionId);

    logEvent(db, {
      plantId: condition.plant_id as number,
      eventType: 'condition_resolved',
      newValue: condition.condition_name as string,
      reason: `Condition resolved: ${condition.condition_name}`,
    });

    const updated = db.prepare(
      `SELECT * FROM plant_conditions WHERE id = ?`
    ).get(conditionId);

    res.json(updated);
  });

  return router;
}
