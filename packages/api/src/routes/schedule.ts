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
    const fromRaw = typeof req.query.from === 'string' ? req.query.from : undefined;

    let from: string;
    if (fromRaw === undefined || fromRaw === '') {
      from = today;
    } else if (!/^\d{4}-\d{2}-\d{2}$/.test(fromRaw) || isNaN(new Date(fromRaw + 'T00:00:00Z').getTime())) {
      res.status(400).json({ error: 'Invalid from param, expected YYYY-MM-DD' });
      return;
    } else {
      from = fromRaw;
    }

    const daysRaw = typeof req.query.days === 'string' ? req.query.days : undefined;
    let dayCount = 7;
    if (daysRaw !== undefined) {
      const parsed = Number(daysRaw);
      if (!Number.isInteger(parsed) || parsed < 1 || parsed > 30) {
        res.status(400).json({ error: 'Invalid days param, expected integer in [1, 30]' });
        return;
      }
      dayCount = parsed;
    }

    const to = addDays(from, dayCount - 1);

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

    // De-dupe: exclude plants whose date is already in the visible window [from, to].
    // Without this, plants dated in [from, today-1] show up in both their natural cell AND today's overdue rollup.
    const overdueNotInWindow = overdue.filter(p => p.next_water_date < from);

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
    for (let i = 0; i < dayCount; i++) {
      const date = addDays(from, i);
      const is_today = date === today;
      const bucket = plants.filter(p => p.next_water_date === date);
      let plant_ids = bucket.map(p => p.id);
      let plant_names = bucket.map(p => p.name);
      let overdue_ids: number[] = [];

      if (is_today && overdueNotInWindow.length > 0) {
        overdue_ids = overdueNotInWindow.map(p => p.id);
        plant_ids = [...overdue_ids, ...plant_ids];
        plant_names = [...overdueNotInWindow.map(p => p.name), ...plant_names];
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
