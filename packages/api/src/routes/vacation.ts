import { Router, Request, Response } from 'express';
import type Database from 'better-sqlite3';
import { isVacationActive, startVacation, endVacation, getVacationStatus } from '../scheduling/vacation.js';

export function createVacationRouter(db: Database.Database): Router {
  const router = Router();

  // GET /api/vacation — return current vacation status
  router.get('/', (_req: Request, res: Response) => {
    const status = getVacationStatus(db);
    res.json(status);
  });

  // POST /api/vacation — set vacation mode
  // Body: { until: "YYYY-MM-DD" }
  router.post('/', (req: Request, res: Response) => {
    const { until } = req.body as { until?: string };

    if (!until) {
      res.status(400).json({ error: 'until is required' });
      return;
    }

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(until) || isNaN(Date.parse(until))) {
      res.status(400).json({ error: 'until must be a valid date in YYYY-MM-DD format' });
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    if (until <= today) {
      res.status(400).json({ error: 'until must be a future date' });
      return;
    }

    startVacation(db, until);
    res.json({ active: true, until });
  });

  // DELETE /api/vacation — end vacation early, recalculate schedules
  router.delete('/', (req: Request, res: Response) => {
    if (!isVacationActive(db)) {
      res.status(404).json({ error: 'No active vacation found' });
      return;
    }

    endVacation(db);
    res.json({ active: false, recalculated: true });
  });

  return router;
}
