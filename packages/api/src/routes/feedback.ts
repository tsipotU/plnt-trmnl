import { Router, Request, Response, NextFunction } from 'express';
import type Database from 'better-sqlite3';
import multer from 'multer';
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { logEvent } from '../database/event-log.js';

const VALID_CATEGORIES = ['bug', 'feature', 'improvement', 'other'];
const VALID_STATUSES = ['open', 'in_progress', 'done', 'wont_fix'];

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const MAX_IMAGES_PER_FEEDBACK = 3;

export interface FeedbackRouterOptions {
  /** Absolute path where uploaded images are stored. Created if missing. */
  uploadDir: string;
}

interface FeedbackImageRow {
  id: number;
  feedback_id: number;
  filename: string;
  created_at: string;
}

function imageUrl(filename: string): string {
  return `/api/feedback/images/${encodeURIComponent(filename)}`;
}

function listImages(db: Database.Database, feedbackId: number) {
  const rows = db
    .prepare(
      `SELECT * FROM feedback_images WHERE feedback_id = ? ORDER BY id ASC`,
    )
    .all(feedbackId) as FeedbackImageRow[];
  return rows.map((r) => ({
    id: r.id,
    filename: r.filename,
    url: imageUrl(r.filename),
    created_at: r.created_at,
  }));
}

function safeUnlink(filePath: string): void {
  try {
    fs.unlinkSync(filePath);
  } catch {
    // Ignore — file may already be gone; deletion remains idempotent.
  }
}

export function createFeedbackRouter(
  db: Database.Database,
  options: FeedbackRouterOptions,
): Router {
  const router = Router();
  const { uploadDir } = options;
  fs.mkdirSync(uploadDir, { recursive: true });

  const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase().slice(0, 10) || '';
      cb(null, `${randomUUID()}${ext}`);
    },
  });

  const upload = multer({
    storage,
    limits: {
      fileSize: MAX_IMAGE_SIZE_BYTES,
      files: MAX_IMAGES_PER_FEEDBACK,
    },
    fileFilter: (_req, file, cb) => {
      if (!file.mimetype.startsWith('image/')) {
        cb(new MulterUserError('Only image/* files are accepted'));
        return;
      }
      cb(null, true);
    },
  });

  // Multer errors must be translated to 400 with a useful message. We also clean
  // up any partial uploads in the request so filesystem stays tidy.
  function handleUpload(req: Request, res: Response, next: NextFunction) {
    upload.array('images', MAX_IMAGES_PER_FEEDBACK + 1)(req, res, (err: unknown) => {
      if (!err) {
        next();
        return;
      }
      // Clean up any files that already landed on disk before the error.
      const files = (req.files as Express.Multer.File[] | undefined) ?? [];
      for (const f of files) safeUnlink(f.path);

      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          res.status(400).json({ error: 'Image too large — max 5MB' });
          return;
        }
        if (err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE') {
          res.status(400).json({
            error: `At most ${MAX_IMAGES_PER_FEEDBACK} images are allowed`,
          });
          return;
        }
        res.status(400).json({ error: err.message });
        return;
      }
      if (err instanceof MulterUserError) {
        res.status(400).json({ error: err.message });
        return;
      }
      next(err as Error);
    });
  }

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
              (SELECT COUNT(*) FROM feedback_comments WHERE feedback_id = f.id) AS comment_count,
              (SELECT COUNT(*) FROM feedback_images   WHERE feedback_id = f.id) AS image_count
       FROM feedback f
       ${where}
       ORDER BY f.created_at DESC, f.id DESC`
    ).all(...params);

    res.json(rows);
  });

  // GET /api/feedback/images/:filename — serve a stored image
  // Registered before /:id so the literal segment wins.
  router.get('/images/:filename', (req: Request, res: Response) => {
    const filenameParam = req.params.filename;
    const filename = typeof filenameParam === 'string' ? filenameParam : '';
    // Defence in depth: filename is a bare basename (no slashes, no ..).
    if (!filename || filename.includes('/') || filename.includes('\\') || filename.includes('..')) {
      res.status(400).json({ error: 'Invalid filename' });
      return;
    }
    const resolved = path.resolve(uploadDir, filename);
    if (!resolved.startsWith(path.resolve(uploadDir) + path.sep)) {
      res.status(400).json({ error: 'Invalid filename' });
      return;
    }
    if (!fs.existsSync(resolved)) {
      res.status(404).json({ error: 'Image not found' });
      return;
    }
    res.sendFile(resolved);
  });

  // GET /api/feedback/:id — single item with comments + images arrays
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

    const images = listImages(db, feedbackId);

    res.json({ ...row, comments, images });
  });

  // POST /api/feedback — create feedback (optional multipart images)
  router.post('/', handleUpload, (req: Request, res: Response) => {
    const uploadedFiles = (req.files as Express.Multer.File[] | undefined) ?? [];

    const cleanupUploads = () => {
      for (const f of uploadedFiles) safeUnlink(f.path);
    };

    const { title, description, category, pagePath } = req.body;

    if (!title) {
      cleanupUploads();
      res.status(400).json({ error: 'title is required' });
      return;
    }

    if (typeof title === 'string' && title.length > 200) {
      cleanupUploads();
      res.status(400).json({ error: 'title must not exceed 200 characters' });
      return;
    }

    if (!category) {
      cleanupUploads();
      res.status(400).json({ error: 'category is required' });
      return;
    }

    if (!VALID_CATEGORIES.includes(category)) {
      cleanupUploads();
      res.status(400).json({ error: `category must be one of: ${VALID_CATEGORIES.join(', ')}` });
      return;
    }

    const result = db.prepare(
      `INSERT INTO feedback (title, description, category, page_path)
       VALUES (?, ?, ?, ?)`
    ).run(title, description ?? null, category, pagePath ?? null);

    const feedbackId = Number(result.lastInsertRowid);

    const insertImage = db.prepare(
      `INSERT INTO feedback_images (feedback_id, filename) VALUES (?, ?)`
    );
    for (const f of uploadedFiles) {
      insertImage.run(feedbackId, f.filename);
    }

    const feedback = db.prepare(`SELECT * FROM feedback WHERE id = ?`).get(feedbackId) as Record<string, unknown>;
    const images = listImages(db, feedbackId);

    logEvent(db, {
      plantId: null,
      eventType: 'feedback_created',
      newValue: String(feedbackId),
      reason: `Feedback created: ${title}${uploadedFiles.length ? ` (+${uploadedFiles.length} image${uploadedFiles.length === 1 ? '' : 's'})` : ''}`,
    });

    res.status(201).json({ ...feedback, images });
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

    const updated = db.prepare(`SELECT * FROM feedback WHERE id = ?`).get(feedbackId) as Record<string, unknown>;
    const images = listImages(db, feedbackId);
    res.json({ ...updated, images });
  });

  // DELETE /api/feedback/:id — delete feedback (cascades to comments + images)
  router.delete('/:id', (req: Request, res: Response) => {
    const feedbackId = Number(req.params.id);

    const existing = db.prepare(`SELECT id FROM feedback WHERE id = ?`).get(feedbackId);

    if (!existing) {
      res.status(404).json({ error: 'Feedback not found' });
      return;
    }

    // Collect filenames BEFORE the DB cascade wipes them.
    const images = db.prepare(
      `SELECT filename FROM feedback_images WHERE feedback_id = ?`
    ).all(feedbackId) as Array<{ filename: string }>;

    db.prepare(`DELETE FROM feedback WHERE id = ?`).run(feedbackId);

    // Remove files last — DB is source of truth. Missing files are tolerated.
    for (const img of images) {
      safeUnlink(path.join(uploadDir, img.filename));
    }

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

/**
 * Sentinel error used by the multer fileFilter so the upload middleware can
 * distinguish "user-facing 400" from internal failures.
 */
class MulterUserError extends Error {}
