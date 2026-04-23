import { Router, Request, Response } from 'express';
import type Database from 'better-sqlite3';
import { adjustInterval, checkConvergence } from '../scheduling/calibration.js';
import { calculateNextWaterDate } from '../scheduling/engine.js';
import { logEvent, logScheduleEvents } from '../database/event-log.js';
import { scheduleNextWater, type ScheduledPlant } from '../scheduling/bin-packer.js';

interface PlantRow {
  id: number;
  current_interval: number;
  calibration_cycle: number;
  is_converged: number;
  archived: number;
  last_watered_at: string | null;
  location: string | null;
  next_water_date: string | null;
  [key: string]: unknown;
}

interface CalibrationQuestionRow {
  id: number;
  plant_id: number;
  question_text: string | null;
  question_type: string | null;
  scale_min_label: string | null;
  scale_max_label: string | null;
  display_order: number;
}

interface CalibrationRow {
  answer_value: number;
}

export function createCalibrationRouter(db: Database.Database): Router {
  const router = Router();

  // GET /api/plants/:id/calibration/next
  // Returns the next calibration question for this plant.
  // Converged plants get a question only every 3rd cycle (cycle % 3 === 0).
  router.get('/plants/:id/calibration/next', (req: Request, res: Response) => {
    const plant = db
      .prepare(`SELECT * FROM plants WHERE id = ?`)
      .get(req.params.id) as PlantRow | undefined;

    if (!plant) {
      res.status(404).json({ error: 'Plant not found' });
      return;
    }

    // Converged plants: skip unless cycle % 3 === 0
    if (plant.is_converged === 1 && plant.calibration_cycle % 3 !== 0) {
      res.json({ skip: true, reason: 'converged' });
      return;
    }

    const questions = db
      .prepare(
        `SELECT * FROM calibration_questions
         WHERE plant_id = ?
         ORDER BY display_order ASC`
      )
      .all(req.params.id) as CalibrationQuestionRow[];

    if (questions.length === 0) {
      res.status(404).json({ error: 'No calibration questions for this plant' });
      return;
    }

    const index = plant.calibration_cycle % questions.length;
    res.json(questions[index]);
  });

  // POST /api/plants/:id/calibration
  // Submit a calibration answer. Body: { questionId, answerValue (1-5) }
  // Adjusts interval, checks convergence, logs the event.
  router.post('/plants/:id/calibration', (req: Request, res: Response) => {
    const plant = db
      .prepare(`SELECT * FROM plants WHERE id = ?`)
      .get(req.params.id) as PlantRow | undefined;

    if (!plant) {
      res.status(404).json({ error: 'Plant not found' });
      return;
    }

    const { questionId, answerValue } = req.body as {
      questionId?: number;
      answerValue?: number;
    };

    if (answerValue == null) {
      res.status(400).json({ error: 'answerValue is required' });
      return;
    }

    if (answerValue < 1 || answerValue > 5) {
      res.status(400).json({ error: 'answerValue must be between 1 and 5' });
      return;
    }

    const oldInterval = plant.current_interval;
    const newInterval = adjustInterval(oldInterval, answerValue);

    // Insert calibration record
    db.prepare(
      `INSERT INTO calibrations (plant_id, question_id, answer_value, interval_before, interval_after)
       VALUES (?, ?, ?, ?, ?)`
    ).run(plant.id, questionId ?? null, answerValue, oldInterval, newInterval);

    // Fetch last 3 answers to check convergence
    const recent = db
      .prepare(
        `SELECT answer_value FROM calibrations
         WHERE plant_id = ?
         ORDER BY id DESC
         LIMIT 3`
      )
      .all(plant.id) as CalibrationRow[];

    const recentValues = recent.map((r) => r.answer_value).reverse();
    const converged = checkConvergence(recentValues) ? 1 : 0;

    // Update plant
    db.prepare(
      `UPDATE plants SET
         current_interval  = ?,
         is_converged      = ?,
         calibration_cycle = calibration_cycle + 1,
         updated_at        = datetime('now')
       WHERE id = ?`
    ).run(newInterval, converged, plant.id);

    // Log calibration event
    logEvent(db, {
      plantId: plant.id,
      eventType: 'calibration',
      oldValue: String(oldInterval),
      newValue: String(newInterval),
      reason: `Calibration answer: ${answerValue}/5`,
    });

    // If the interval changed and we have a last_watered_at, recompute
    // next_water_date through the bin-packer so overflow/congested events fire.
    if (newInterval !== oldInterval && plant.last_watered_at) {
      const idealDate = calculateNextWaterDate(plant.last_watered_at, newInterval);
      const existing = db.prepare(
        `SELECT id, location, next_water_date as nextWaterDate
           FROM plants
           WHERE archived = 0 AND id != ? AND next_water_date IS NOT NULL`
      ).all(plant.id) as ScheduledPlant[];
      const scheduled = scheduleNextWater(idealDate, plant.location ?? '', existing);

      db.prepare(`UPDATE plants SET next_water_date = ? WHERE id = ?`).run(scheduled.date, plant.id);
      logScheduleEvents(db, plant.id, scheduled);
    }

    const updated = db
      .prepare(`SELECT * FROM plants WHERE id = ?`)
      .get(plant.id) as PlantRow;

    res.json({ current_interval: updated.current_interval, is_converged: updated.is_converged });
  });

  // GET /api/calibration/due
  // Returns all active plants due for calibration today.
  // Converged plants are included only when calibration_cycle % 3 === 0.
  router.get('/calibration/due', (_req: Request, res: Response) => {
    const today = new Date().toISOString().slice(0, 10);

    const plants = db
      .prepare(
        `SELECT * FROM plants
         WHERE next_water_date = ?
           AND archived = 0
         ORDER BY next_water_date ASC`
      )
      .all(today) as PlantRow[];

    const due = plants.filter((p) => {
      if (p.is_converged === 1) {
        return p.calibration_cycle % 3 === 0;
      }
      return true;
    });

    res.json(due);
  });

  return router;
}
