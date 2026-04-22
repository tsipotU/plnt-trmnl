import { Router, Request, Response } from 'express';
import type Database from 'better-sqlite3';
import { logEvent } from '../database/event-log.js';

const VALID_CATEGORIES = ['bug', 'feature', 'improvement', 'other'];
const VALID_STATUSES = ['open', 'in_progress', 'done', 'wont_fix'];

export function createFeedbackRouter(db: Database.Database): Router {
  const router = Router();

  // GET /api/feedback — list all with comment_count, filterable, newest first
  router.get('/', (req: Request, res: Response) => {
    const { category, status } = req.query;

    const conditions: string[] = [];
    const params: unknown[] = [];

    if (category) {
      conditions.push('f.category = ?');
      params.push(category);
    }
    if (status) {
      conditions.push('f.status = ?');
      params.push(status);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const rows = db.prepare(
      `SELECT f.*,
              (SELECT COUNT(*) FROM feedback_comments WHERE feedback_id = f.id) AS comment_count
       FROM feedback f
       ${where}
       ORDER BY f.created_at DESC, f.id DESC`
    ).all(...params);

    res.json(rows);
  });

  // GET /api/feedback/:id — single item with comments array
  router.get('/:id', (req: Request, res: Response) => {
    const feedbackId = Number(req.params.id);

    const row = db.prepare(`SELECT * FROM feedback WHERE id = ?`).get(feedbackId) as
      | Record<string, unknown>
      | undefined;

    if (!row) {
      res.status(404).json({ error: 'Feedback not found' });
      return;
    }

    const comments = db.prepare(
      `SELECT * FROM feedback_comments WHERE feedback_id = ? ORDER BY id ASC`
    ).all(feedbackId);

    res.json({ ...row, comments });
  });

  // POST /api/feedback — create feedback
  router.post('/', (req: Request, res: Response) => {
    const { title, description, category, pagePath } = req.body;

    if (!title) {
      res.status(400).json({ error: 'title is required' });
      return;
    }

    if (typeof title === 'string' && title.length > 200) {
      res.status(400).json({ error: 'title must not exceed 200 characters' });
      return;
    }

    if (!category) {
      res.status(400).json({ error: 'category is required' });
      return;
    }

    if (!VALID_CATEGORIES.includes(category)) {
      res.status(400).json({ error: `category must be one of: ${VALID_CATEGORIES.join(', ')}` });
      return;
    }

    const result = db.prepare(
      `INSERT INTO feedback (title, description, category, page_path)
       VALUES (?, ?, ?, ?)`
    ).run(title, description ?? null, category, pagePath ?? null);

    const feedback = db.prepare(`SELECT * FROM feedback WHERE id = ?`).get(result.lastInsertRowid) as Record<string, unknown>;

    logEvent(db, {
      plantId: null,
      eventType: 'feedback_created',
      newValue: String(result.lastInsertRowid),
      reason: `Feedback created: ${title}`,
    });

    res.status(201).json(feedback);
  });

  // PUT /api/feedback/:id — update feedback
  router.put('/:id', (req: Request, res: Response) => {
    const feedbackId = Number(req.params.id);

    const existing = db.prepare(`SELECT * FROM feedback WHERE id = ?`).get(feedbackId) as
      | Record<string, unknown>
      | undefined;

    if (!existing) {
      res.status(404).json({ error: 'Feedback not found' });
      return;
    }

    const { title, description, category, status } = req.body;

    if (category !== undefined && !VALID_CATEGORIES.includes(category)) {
      res.status(400).json({ error: `category must be one of: ${VALID_CATEGORIES.join(', ')}` });
      return;
    }

    if (status !== undefined && !VALID_STATUSES.includes(status)) {
      res.status(400).json({ error: `status must be one of: ${VALID_STATUSES.join(', ')}` });
      return;
    }

    const oldStatus = existing.status as string;
    const statusChanged = status !== undefined && status !== oldStatus;

    db.prepare(
      `UPDATE feedback SET
         title       = COALESCE(?, title),
         description = COALESCE(?, description),
         category    = COALESCE(?, category),
         status      = COALESCE(?, status),
         updated_at  = datetime('now')
       WHERE id = ?`
    ).run(
      title ?? null,
      description ?? null,
      category ?? null,
      status ?? null,
      feedbackId
    );

    if (statusChanged) {
      logEvent(db, {
        plantId: null,
        eventType: 'feedback_status_changed',
        oldValue: oldStatus,
        newValue: status,
        reason: `Feedback #${feedbackId} status changed from ${oldStatus} to ${status}`,
      });
    }

    const updated = db.prepare(`SELECT * FROM feedback WHERE id = ?`).get(feedbackId);
    res.json(updated);
  });

  // DELETE /api/feedback/:id — delete feedback (cascades to comments)
  router.delete('/:id', (req: Request, res: Response) => {
    const feedbackId = Number(req.params.id);

    const existing = db.prepare(`SELECT id FROM feedback WHERE id = ?`).get(feedbackId);

    if (!existing) {
      res.status(404).json({ error: 'Feedback not found' });
      return;
    }

    db.prepare(`DELETE FROM feedback WHERE id = ?`).run(feedbackId);
    res.status(204).send();
  });

  // POST /api/feedback/:id/comments — add a comment
  router.post('/:id/comments', (req: Request, res: Response) => {
    const feedbackId = Number(req.params.id);

    const existing = db.prepare(`SELECT id FROM feedback WHERE id = ?`).get(feedbackId);

    if (!existing) {
      res.status(404).json({ error: 'Feedback not found' });
      return;
    }

    const { body } = req.body;

    if (!body) {
      res.status(400).json({ error: 'body is required' });
      return;
    }

    if (typeof body === 'string' && body.length > 2000) {
      res.status(400).json({ error: 'body must not exceed 2000 characters' });
      return;
    }

    const result = db.prepare(
      `INSERT INTO feedback_comments (feedback_id, body) VALUES (?, ?)`
    ).run(feedbackId, body);

    const comment = db.prepare(`SELECT * FROM feedback_comments WHERE id = ?`).get(result.lastInsertRowid);
    res.status(201).json(comment);
  });

  // PUT /api/feedback/comments/:id — edit a comment
  router.put('/comments/:id', (req: Request, res: Response) => {
    const commentId = Number(req.params.id);

    const existing = db.prepare(`SELECT id FROM feedback_comments WHERE id = ?`).get(commentId);

    if (!existing) {
      res.status(404).json({ error: 'Comment not found' });
      return;
    }

    const { body } = req.body;

    if (!body || typeof body !== 'string' || !body.trim()) {
      res.status(400).json({ error: 'body is required' });
      return;
    }
    if (body.trim().length > 2000) {
      res.status(400).json({ error: 'body must be 2000 characters or fewer' });
      return;
    }

    db.prepare(
      `UPDATE feedback_comments SET body = ?, updated_at = datetime('now') WHERE id = ?`
    ).run(body.trim(), commentId);

    const updated = db.prepare(`SELECT * FROM feedback_comments WHERE id = ?`).get(commentId);
    res.json(updated);
  });

  // DELETE /api/feedback/comments/:id — delete a comment
  router.delete('/comments/:id', (req: Request, res: Response) => {
    const commentId = Number(req.params.id);

    const existing = db.prepare(`SELECT id FROM feedback_comments WHERE id = ?`).get(commentId);

    if (!existing) {
      res.status(404).json({ error: 'Comment not found' });
      return;
    }

    db.prepare(`DELETE FROM feedback_comments WHERE id = ?`).run(commentId);
    res.status(204).send();
  });

  return router;
}
