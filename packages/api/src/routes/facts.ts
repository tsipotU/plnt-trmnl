import { Router, Request, Response } from 'express';
import type Database from 'better-sqlite3';
import { logEvent } from '../database/event-log.js';
import { pickDailyFact, getTodayFact } from '../facts/pick-daily.js';

export function createFactsRouter(db: Database.Database): Router {
  const router = Router();

  // GET /api/facts — list all facts, optional ?q= text filter
  router.get('/facts', (req: Request, res: Response) => {
    const q = req.query.q as string | undefined;

    let facts: unknown[];
    if (q && q.length > 0) {
      facts = db.prepare(
        `SELECT id, text, source, plant_id, shown_count, is_disabled
         FROM facts
         WHERE text LIKE ? COLLATE NOCASE`
      ).all(`%${q}%`);
    } else {
      facts = db.prepare(
        `SELECT id, text, source, plant_id, shown_count, is_disabled
         FROM facts`
      ).all();
    }

    res.json(facts);
  });

  // GET /api/facts/today — today's rotating fact (issue #38).
  // Returns the fact the daily cron picked, or 404 if none is set.
  router.get('/facts/today', (_req: Request, res: Response) => {
    const fact = getTodayFact(db);
    if (!fact) {
      res.status(404).json({ error: 'No fact for today yet' });
      return;
    }
    res.json(fact);
  });

  // POST /api/facts/pick-daily — pick today's fact (idempotent-ish: each call
  // advances the rotation). Used by the daily 6 AM cron.
  router.post('/facts/pick-daily', (_req: Request, res: Response) => {
    const picked = pickDailyFact(db);
    if (!picked) {
      res.status(404).json({ error: 'No eligible facts' });
      return;
    }
    res.json(picked);
  });

  // GET /api/facts/next — get next fact for display (lowest shown_count, not disabled)
  router.get('/facts/next', (_req: Request, res: Response) => {
    const fact = db.prepare(
      `SELECT * FROM facts
       WHERE is_disabled = 0
       ORDER BY shown_count ASC, RANDOM()
       LIMIT 1`
    ).get() as Record<string, unknown> | undefined;

    if (!fact) {
      res.status(404).json({ error: 'No facts available' });
      return;
    }

    db.prepare(
      `UPDATE facts SET shown_count = shown_count + 1 WHERE id = ?`
    ).run(fact.id);

    res.json(fact);
  });

  // POST /api/facts/:id/disable — disable a fact
  router.post('/facts/:id/disable', (req: Request, res: Response) => {
    const factId = Number(req.params.id);

    const fact = db.prepare(`SELECT * FROM facts WHERE id = ?`).get(factId) as
      | Record<string, unknown>
      | undefined;

    if (!fact) {
      res.status(404).json({ error: 'Fact not found' });
      return;
    }

    db.prepare(
      `UPDATE facts SET is_disabled = 1 WHERE id = ?`
    ).run(factId);

    logEvent(db, {
      plantId: fact.plant_id as number | null,
      eventType: 'fact_disabled',
      newValue: String(factId),
      reason: `Fact ${factId} disabled`,
    });

    const updated = db.prepare(`SELECT * FROM facts WHERE id = ?`).get(factId);
    res.json(updated);
  });

  return router;
}
