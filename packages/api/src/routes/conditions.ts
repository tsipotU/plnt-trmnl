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
         (plant_id, condition_name, symptoms, remedy, severity, detected_via, is_active)
       VALUES (?, ?, ?, ?, ?, 'manual', 1)`
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
