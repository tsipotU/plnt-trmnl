import { Router, type Request, type Response } from 'express';
import type Database from 'better-sqlite3';

function addDays(date: string, n: number): string {
  const d = new Date(date + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function createScheduleRouter(db: Database.Database): Router {
  const router = Router();

  router.get('/week', (req: Request, res: Response) => {
    const today = new Date().toISOString().slice(0, 10);
    const from = typeof req.query.from === 'string' ? req.query.from : today;
    const to = addDays(from, 6);

    const plants = db.prepare(
      `SELECT id, name, next_water_date, location
         FROM plants
         WHERE archived = 0 AND next_water_date IS NOT NULL
           AND next_water_date BETWEEN ? AND ?`
    ).all(from, to) as { id: number; name: string; next_water_date: string; location: string | null }[];

    const overdue = db.prepare(
      `SELECT id, name, next_water_date FROM plants
         WHERE archived = 0 AND next_water_date IS NOT NULL AND next_water_date < ?`
    ).all(today) as { id: number; name: string; next_water_date: string }[];

    // Vacation state in this project is stored as a single `vacation_until` key in
    // `app_state` (end date only — open-ended start). A day is "in vacation" if it
    // is on or before `vacation_until` and on or after today (retroactive flagging
    // of past days is meaningless for a 7-day lookahead strip).
    let vacationUntil: string | null = null;
    try {
      const row = db.prepare(
        `SELECT value FROM app_state WHERE key = 'vacation_until'`
      ).get() as { value: string } | undefined;
      if (row) vacationUntil = row.value;
    } catch {
      vacationUntil = null;
    }

    const days = [];
    for (let i = 0; i < 7; i++) {
      const date = addDays(from, i);
      const is_today = date === today;
      const bucket = plants.filter(p => p.next_water_date === date);
      let plant_ids = bucket.map(p => p.id);
      let plant_names = bucket.map(p => p.name);
      let overdue_ids: number[] = [];

      if (is_today && overdue.length > 0) {
        overdue_ids = overdue.map(p => p.id);
        plant_ids = [...overdue_ids, ...plant_ids];
        plant_names = [...overdue.map(p => p.name), ...plant_names];
      }

      const inVacation =
        vacationUntil !== null && date >= today && date <= vacationUntil;

      days.push({
        date,
        is_today,
        plant_ids,
        plant_names,
        count: plant_ids.length,
        overdue_ids,
        vacation: inVacation,
      });
    }

    res.json({ days });
  });

  return router;
}
