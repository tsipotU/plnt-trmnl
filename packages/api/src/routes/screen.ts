import { Router, Request, Response } from 'express';
import type Database from 'better-sqlite3';
import {
  calculateWaterAmount,
  isHeatingSeasonActive,
  type MonthDay,
} from '../scheduling/water-calculator.js';
import { isFertilizerDue } from '../scheduling/engine.js';
import { pickDailyFact, getTodayFact, type PickedFact } from '../facts/pick-daily.js';

interface HeatingSeasonConfig {
  heatingSeasonStart: MonthDay;
  heatingSeasonEnd: MonthDay;
}

interface PlantRow {
  id: number;
  name: string;
  species: string | null;
  identifier: string | null;
  location: string | null;
  pot_size_cm: number | null;
  pot_size_category: string | null;
  water_ratio: number | null;
  water_description: string | null;
  heating_season_modifier: number;
  fertilizer_interval_weeks: number | null;
  last_fertilized_at: string | null;
  illustration_path: string | null;
  calibration_cycle: number;
  is_converged: number;
  current_interval: number;
  next_water_date: string | null;
  archived: number;
}

interface CalibrationQuestionRow {
  id: number;
  plant_id: number;
  question_text: string | null;
  scale_min_label: string | null;
  scale_max_label: string | null;
  display_order: number;
}

interface ConditionRow {
  id: number;
  condition_name: string | null;
  severity: string | null;
  is_active: number;
}

interface FactRow {
  id: number;
  text: string;
  shown_count: number;
}

interface OrnamentRow {
  id: number;
  image_path: string;
  shown_count: number;
}

interface AppStateRow {
  value: string;
}

type CalibrationPayload =
  | { questionText: string | null; scaleMinLabel: string | null; scaleMaxLabel: string | null }
  | { skip: true; reason: string };

const SEVERITY_ORDER: Record<string, number> = {
  critical: 3,
  warning: 2,
  info: 1,
};

function getCalibration(db: Database.Database, plant: PlantRow): CalibrationPayload {
  if (plant.is_converged === 1 && plant.calibration_cycle % 3 !== 0) {
    return { skip: true, reason: 'converged' };
  }

  const questions = db
    .prepare(
      `SELECT * FROM calibration_questions
       WHERE plant_id = ?
       ORDER BY display_order ASC`
    )
    .all(plant.id) as CalibrationQuestionRow[];

  if (questions.length === 0) {
    return { skip: true, reason: 'no_questions' };
  }

  const index = plant.calibration_cycle % questions.length;
  const q = questions[index];
  return {
    questionText: q.question_text,
    scaleMinLabel: q.scale_min_label,
    scaleMaxLabel: q.scale_max_label,
  };
}

function getNextWatering(
  db: Database.Database,
  today: string,
  excludeIds: number[]
): { name: string; date: string; interval: number } | null {
  const excludePlaceholders = excludeIds.length > 0 ? excludeIds.map(() => '?').join(', ') : null;
  const whereExclude =
    excludePlaceholders ? `AND id NOT IN (${excludePlaceholders})` : '';

  const next = db
    .prepare(
      `SELECT name, next_water_date, current_interval
       FROM plants
       WHERE next_water_date > ?
         AND archived = 0
         ${whereExclude}
       ORDER BY next_water_date ASC
       LIMIT 1`
    )
    .get(today, ...excludeIds) as
    | { name: string; next_water_date: string; current_interval: number }
    | undefined;

  if (!next) return null;
  return { name: next.name, date: next.next_water_date, interval: next.current_interval };
}

export function createScreenRouter(
  db: Database.Database,
  config: HeatingSeasonConfig
): Router {
  const router = Router();

  // GET /api/screen/today
  // Returns the daily render payload for the TRMNL screen.
  // Optional ?date=YYYY-MM-DD for testing; defaults to today.
  router.get('/screen/today', (req: Request, res: Response) => {
    const today = (req.query.date as string | undefined) ?? new Date().toISOString().slice(0, 10);
    const todayDate = new Date(today + 'T00:00:00Z');

    // 1. Check vacation mode
    const vacationRow = db
      .prepare(`SELECT value FROM app_state WHERE key = 'vacation_until'`)
      .get() as AppStateRow | undefined;

    const vacationActive =
      vacationRow != null && today < vacationRow.value;

    // 2. Query plants due today (max 2), unless vacation
    const duePlants = vacationActive
      ? []
      : (db
          .prepare(
            `SELECT * FROM plants
             WHERE next_water_date = ?
               AND archived = 0
             ORDER BY id ASC
             LIMIT 2`
          )
          .all(today) as PlantRow[]);

    // Today's rotating fact (#38). The daily cron seeds app_state; if
    // nothing is cached (first run / missed cron / test fixture), pick now.
    let todaysFact: PickedFact | null = getTodayFact(db, today);
    if (!todaysFact) {
      todaysFact = pickDailyFact(db);
    }

    if (duePlants.length > 0) {
      // ── Watering day ─────────────────────────────────────────────────────
      const isHeatingSeason = isHeatingSeasonActive(
        todayDate,
        config.heatingSeasonStart,
        config.heatingSeasonEnd
      );

      const plantPayloads = duePlants.map((plant) => {
        // Water amount
        const waterAmountMl =
          plant.pot_size_cm != null && plant.water_ratio != null
            ? calculateWaterAmount({
                potSizeCm: plant.pot_size_cm,
                waterRatio: plant.water_ratio,
                isHeatingSeason,
                heatingSeasonModifier: plant.heating_season_modifier ?? 1.0,
              })
            : null;

        // Fertilizer
        const fertilizerDue = isFertilizerDue(
          plant.last_fertilized_at,
          plant.fertilizer_interval_weeks ?? 4,
          todayDate,
          isHeatingSeason
        );

        // Active condition — first by severity DESC
        const conditions = db
          .prepare(
            `SELECT * FROM plant_conditions
             WHERE plant_id = ? AND is_active = 1`
          )
          .all(plant.id) as ConditionRow[];

        const sorted = conditions.sort(
          (a, b) =>
            (SEVERITY_ORDER[b.severity ?? 'info'] ?? 0) -
            (SEVERITY_ORDER[a.severity ?? 'info'] ?? 0)
        );
        const watchFor = sorted.length > 0 ? sorted[0].condition_name : null;

        // Calibration question
        const calibration = getCalibration(db, plant);

        // Illustration path
        const illustrationPath = plant.illustration_path ?? '/assets/plants/placeholder.png';

        return {
          id: plant.id,
          name: plant.name,
          species: plant.species ?? null,
          identifier: plant.identifier ?? null,
          location: plant.location ?? null,
          potSizeCm: plant.pot_size_cm ?? null,
          potSizeCategory: plant.pot_size_category ?? null,
          waterAmountMl,
          waterDescription: plant.water_description ?? null,
          fertilizerDue,
          watchFor,
          illustrationPath,
          calibration,
        };
      });

      const duePlantIds = duePlants.map((p) => p.id);
      const nextWatering = getNextWatering(db, today, duePlantIds);

      res.json({
        type: 'watering',
        date: today,
        plants: plantPayloads,
        nextWatering,
        fact: todaysFact
          ? { id: todaysFact.id, text: todaysFact.text }
          : null,
      });
      return;
    }

    // ── Rest day ────────────────────────────────────────────────────────────

    // Today's fact (#38) — picked once per day by the cron; otherwise
    // lazily selected above.
    const fact = todaysFact;

    // Get next ornament (lowest shown_count)
    const ornament = db
      .prepare(
        `SELECT * FROM decorative_ornaments
         ORDER BY shown_count ASC, RANDOM()
         LIMIT 1`
      )
      .get() as OrnamentRow | undefined;

    if (ornament) {
      db.prepare(
        `UPDATE decorative_ornaments SET shown_count = shown_count + 1 WHERE id = ?`
      ).run(ornament.id);
    }

    // Next upcoming watering
    const nextWatering = getNextWatering(db, today, []);

    // Overdue plants (skip if vacation active)
    const overdueRows = vacationActive
      ? []
      : (db
          .prepare(
            `SELECT id, name, next_water_date
             FROM plants
             WHERE next_water_date < ?
               AND archived = 0
             ORDER BY next_water_date ASC`
          )
          .all(today) as Array<{ id: number; name: string; next_water_date: string }>);

    const overdue = overdueRows
      .map((p) => {
        const overdueDate = new Date(p.next_water_date + 'T00:00:00Z');
        const diffMs = todayDate.getTime() - overdueDate.getTime();
        const daysOverdue = Math.round(diffMs / (1000 * 60 * 60 * 24));
        return { id: p.id, name: p.name, daysOverdue };
      })
      .sort((a, b) => b.daysOverdue - a.daysOverdue);

    res.json({
      type: 'rest',
      date: today,
      fact: fact
        ? { id: fact.id, text: fact.text }
        : null,
      ornament: ornament
        ? { id: ornament.id, imagePath: ornament.image_path }
        : null,
      nextWatering,
      overdue,
    });
  });

  return router;
}
