import { Router } from 'express';
import type Database from 'better-sqlite3';

/**
 * /api/system/* — small introspection endpoints used by the SPA to adapt UI
 * to backend reality (e.g., is an external AI tool actively enriching plants).
 */
export function createSystemRouter(db: Database.Database): Router {
  const router = Router();

  // GET /api/system/ai-connection
  // Returns { connected: boolean }. "Connected" = at least one
  // `enrichment_complete` event in the last 7 days, the heuristic for
  // "the user has wired up an AI tool that polls /api/plants?enrichment=pending".
  router.get('/ai-connection', (_req, res) => {
    const row = db
      .prepare(
        `SELECT 1 FROM event_log
         WHERE event_type = 'enrichment_complete'
           AND created_at >= datetime('now', '-7 days')
         LIMIT 1`,
      )
      .get();
    res.json({ connected: !!row });
  });

  return router;
}
