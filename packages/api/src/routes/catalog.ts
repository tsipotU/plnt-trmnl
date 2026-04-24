import { Router, Request, Response } from 'express';
import type { Catalog } from '../catalog/loader.js';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

const SUGGEST_DEFAULT_LIMIT = 3;
const SUGGEST_MAX_LIMIT = 5;

/**
 * Read-only catalog routes.
 *
 * GET /api/catalog/search?q=...&limit=20
 *   Case-insensitive substring + token-prefix match across
 *   latin_name, aliases, common_names.en, common_names.nl.
 */
export function createCatalogRouter(catalog: Catalog): Router {
  const router = Router();

  router.get('/search', (req: Request, res: Response) => {
    const q = req.query.q;
    if (typeof q !== 'string' || q.trim().length === 0) {
      res.status(400).json({ error: 'Query parameter "q" is required' });
      return;
    }

    let limit = DEFAULT_LIMIT;
    if (req.query.limit !== undefined) {
      const parsed = Number(req.query.limit);
      if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed < 1) {
        res.status(400).json({ error: 'limit must be a positive integer' });
        return;
      }
      limit = Math.min(parsed, MAX_LIMIT);
    }

    const results = catalog.search(q, limit);
    res.json(results);
  });

  // GET /api/catalog/suggest?q=...&limit=3
  // Fuzzy "did you mean" fallback for enrichment when Claude can't recognise
  // a typo'd plant name. Returns top 1-3 matches above an internal similarity
  // threshold, or [] when nothing is close enough.
  router.get('/suggest', (req: Request, res: Response) => {
    const q = req.query.q;
    if (typeof q !== 'string' || q.trim().length === 0) {
      res.status(400).json({ error: 'Query parameter "q" is required' });
      return;
    }

    let limit = SUGGEST_DEFAULT_LIMIT;
    if (req.query.limit !== undefined) {
      const parsed = Number(req.query.limit);
      if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed < 1) {
        res.status(400).json({ error: 'limit must be a positive integer' });
        return;
      }
      limit = Math.min(parsed, SUGGEST_MAX_LIMIT);
    }

    const results = catalog.suggest(q, limit);
    res.json(results);
  });

  return router;
}
