import { Router, Request, Response } from 'express';
import type Database from 'better-sqlite3';
import pino from 'pino';
import { calculateNextWaterDate } from '../scheduling/engine.js';
import { logEvent } from '../database/event-log.js';

const logger = pino({ name: 'enrichment.callback' });

interface CalibrationQuestionInput {
  question_text: string;
  question_type: string;
  scale_min_label: string;
  scale_max_label: string;
}

interface CommonConditionInput {
  condition_name: string;
  symptoms: string;
  remedy: string;
  severity: string;
}

interface EnrichmentCallbackBody {
  plant_id: number;
  base_interval: number;
  water_ratio: number;
  water_description: string;
  fertilizer_interval_weeks: number;
  heating_season_modifier: number;
  calibration_questions: CalibrationQuestionInput[];
  common_conditions: CommonConditionInput[];
  facts: string[];
  watch_for?: string;
  illustration_url?: string;
}

interface PlantRow {
  id: number;
  last_watered_at: string | null;
  [key: string]: unknown;
}

export function createEnrichmentRouter(db: Database.Database): Router {
  const router = Router();

  // POST /api/enrichment/callback — receives enrichment result from n8n
  router.post('/callback', (req: Request, res: Response) => {
    const body = req.body as EnrichmentCallbackBody;
    const plantId = body.plant_id;

    const plant = db.prepare('SELECT * FROM plants WHERE id = ?').get(plantId) as PlantRow | undefined;
    if (!plant) {
      res.status(404).json({ error: 'Plant not found' });
      return;
    }

    const newInterval = body.base_interval;
    const lastWateredAt = plant.last_watered_at;
    const nextWaterDate = lastWateredAt
      ? calculateNextWaterDate(lastWateredAt, newInterval)
      : null;

    // 1. Update plant with enrichment data
    db.prepare(
      `UPDATE plants SET
         base_interval             = ?,
         current_interval          = ?,
         water_ratio               = ?,
         water_description         = ?,
         fertilizer_interval_weeks = ?,
         heating_season_modifier   = ?,
         enrichment_status         = 'complete',
         illustration_path         = COALESCE(?, illustration_path),
         next_water_date           = COALESCE(?, next_water_date),
         updated_at                = datetime('now')
       WHERE id = ?`
    ).run(
      newInterval,
      newInterval,
      body.water_ratio,
      body.water_description,
      body.fertilizer_interval_weeks,
      body.heating_season_modifier,
      body.illustration_url ?? null,
      nextWaterDate,
      plantId
    );

    // 2. Insert calibration questions
    const insertQuestion = db.prepare(
      `INSERT INTO calibration_questions
         (plant_id, question_text, question_type, scale_min_label, scale_max_label, display_order)
       VALUES (?, ?, ?, ?, ?, ?)`
    );
    for (let i = 0; i < body.calibration_questions.length; i++) {
      const q = body.calibration_questions[i];
      insertQuestion.run(plantId, q.question_text, q.question_type, q.scale_min_label, q.scale_max_label, i);
    }

    // 3. Insert common conditions as inactive templates
    const insertCondition = db.prepare(
      `INSERT INTO plant_conditions
         (plant_id, condition_name, symptoms, remedy, severity, is_active, detected_via)
       VALUES (?, ?, ?, ?, ?, 0, 'calibration')`
    );
    for (const c of body.common_conditions) {
      insertCondition.run(plantId, c.condition_name, c.symptoms, c.remedy, c.severity);
    }

    // 4. Insert facts
    const insertFact = db.prepare(
      `INSERT INTO facts (plant_id, text, source) VALUES (?, ?, 'enrichment')`
    );
    for (const text of body.facts) {
      insertFact.run(plantId, text);
    }

    // 5. Update enrichment_queue status
    db.prepare(
      `UPDATE enrichment_queue SET status = 'complete' WHERE plant_id = ? AND status != 'complete'`
    ).run(plantId);

    // 6. Log enrichment_complete event
    logEvent(db, {
      plantId,
      eventType: 'enrichment_complete',
      newValue: String(newInterval),
      reason: 'Enrichment data received from n8n',
    });

    logger.info({ plantId }, 'enrichment callback processed');

    res.json({ ok: true });
  });

  return router;
}
