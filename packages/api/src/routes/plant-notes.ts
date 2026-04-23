import { Router, Request, Response } from 'express';
import type Database from 'better-sqlite3';

interface NoteRow {
  id: number;
  plant_id: number;
  body: string;
  created_at: string;
  updated_at: string | null;
}

/**
 * Router for the per-plant notes log (issue #32).
 * Mount as: app.use('/api/plants', createPlantNotesRouter(db))
 */
export function createPlantNotesRouter(db: Database.Database): Router {
  const router = Router();

  // GET /:plantId/notes — newest first
  router.get('/:plantId/notes', (req: Request, res: Response) => {
    const plantId = Number(req.params.plantId);
    if (!Number.isFinite(plantId)) {
      res.status(400).json({ error: 'Invalid plant id' });
      return;
    }

    const plant = db.prepare(`SELECT id FROM plants WHERE id = ?`).get(plantId);
    if (!plant) {
      res.status(404).json({ error: 'Plant not found' });
      return;
    }

    const notes = db
      .prepare(
        `SELECT id, plant_id, body, created_at, updated_at
           FROM plant_notes
           WHERE plant_id = ?
           ORDER BY datetime(created_at) DESC, id DESC`,
      )
      .all(plantId) as NoteRow[];

    res.json(notes);
  });

  // POST /:plantId/notes — create
  router.post('/:plantId/notes', (req: Request, res: Response) => {
    const plantId = Number(req.params.plantId);
    const body = typeof req.body?.body === 'string' ? req.body.body.trim() : '';

    if (!Number.isFinite(plantId)) {
      res.status(400).json({ error: 'Invalid plant id' });
      return;
    }
    if (!body) {
      res.status(400).json({ error: 'body is required' });
      return;
    }

    const plant = db.prepare(`SELECT id FROM plants WHERE id = ?`).get(plantId);
    if (!plant) {
      res.status(404).json({ error: 'Plant not found' });
      return;
    }

    const result = db
      .prepare(`INSERT INTO plant_notes (plant_id, body) VALUES (?, ?)`)
      .run(plantId, body);

    const note = db
      .prepare(`SELECT id, plant_id, body, created_at, updated_at FROM plant_notes WHERE id = ?`)
      .get(result.lastInsertRowid) as NoteRow;

    res.status(201).json(note);
  });

  // PUT /:plantId/notes/:noteId — update
  router.put('/:plantId/notes/:noteId', (req: Request, res: Response) => {
    const plantId = Number(req.params.plantId);
    const noteId = Number(req.params.noteId);
    const body = typeof req.body?.body === 'string' ? req.body.body.trim() : '';

    if (!Number.isFinite(plantId) || !Number.isFinite(noteId)) {
      res.status(400).json({ error: 'Invalid id' });
      return;
    }
    if (!body) {
      res.status(400).json({ error: 'body is required' });
      return;
    }

    const existing = db
      .prepare(`SELECT id FROM plant_notes WHERE id = ? AND plant_id = ?`)
      .get(noteId, plantId) as { id: number } | undefined;

    if (!existing) {
      res.status(404).json({ error: 'Note not found' });
      return;
    }

    db.prepare(
      `UPDATE plant_notes SET body = ?, updated_at = datetime('now') WHERE id = ?`,
    ).run(body, noteId);

    const note = db
      .prepare(`SELECT id, plant_id, body, created_at, updated_at FROM plant_notes WHERE id = ?`)
      .get(noteId) as NoteRow;

    res.json(note);
  });

  // DELETE /:plantId/notes/:noteId
  router.delete('/:plantId/notes/:noteId', (req: Request, res: Response) => {
    const plantId = Number(req.params.plantId);
    const noteId = Number(req.params.noteId);

    if (!Number.isFinite(plantId) || !Number.isFinite(noteId)) {
      res.status(400).json({ error: 'Invalid id' });
      return;
    }

    const existing = db
      .prepare(`SELECT id FROM plant_notes WHERE id = ? AND plant_id = ?`)
      .get(noteId, plantId) as { id: number } | undefined;

    if (!existing) {
      res.status(404).json({ error: 'Note not found' });
      return;
    }

    db.prepare(`DELETE FROM plant_notes WHERE id = ?`).run(noteId);
    res.status(204).end();
  });

  return router;
}
