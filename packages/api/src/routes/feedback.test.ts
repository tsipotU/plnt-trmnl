import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import Database from 'better-sqlite3';
import { initializeSchema } from '../database/schema.js';
import { createFeedbackRouter } from './feedback.js';

function createTestApp() {
  const db = new Database(':memory:');
  initializeSchema(db);
  const app = express();
  app.use(express.json());
  app.use('/api/feedback', createFeedbackRouter(db));
  return { app, db };
}

function insertFeedback(db: Database.Database, overrides: Record<string, unknown> = {}) {
  const defaults = {
    title: 'Test feedback',
    description: 'A description',
    category: 'bug',
    page_path: '/',
    status: 'open',
  };
  const data = { ...defaults, ...overrides };
  const result = db.prepare(
    `INSERT INTO feedback (title, description, category, page_path, status)
     VALUES (?, ?, ?, ?, ?)`
  ).run(data.title, data.description, data.category, data.page_path, data.status);
  return result.lastInsertRowid as number;
}

// ─── POST /api/feedback ───────────────────────────────────────────────────────

describe('POST /api/feedback', () => {
  let app: express.Express;
  let db: Database.Database;

  beforeEach(() => {
    ({ app, db } = createTestApp());
  });

  afterEach(() => {
    db.close();
  });

  it('creates feedback and returns it with 201', async () => {
    const res = await request(app)
      .post('/api/feedback')
      .send({ title: 'Dark mode', description: 'Please add it', category: 'feature', pagePath: '/settings' });

    expect(res.status).toBe(201);
    expect(res.body.title).toBe('Dark mode');
    expect(res.body.description).toBe('Please add it');
    expect(res.body.category).toBe('feature');
    expect(res.body.page_path).toBe('/settings');
    expect(res.body.status).toBe('open');
    expect(res.body.id).toBeTypeOf('number');
  });

  it('creates feedback without description (optional)', async () => {
    const res = await request(app)
      .post('/api/feedback')
      .send({ title: 'Minor issue', category: 'bug' });

    expect(res.status).toBe(201);
    expect(res.body.title).toBe('Minor issue');
    expect(res.body.description).toBeNull();
  });

  it('returns 400 when title is missing', async () => {
    const res = await request(app)
      .post('/api/feedback')
      .send({ category: 'bug' });

    expect(res.status).toBe(400);
  });

  it('returns 400 when category is missing', async () => {
    const res = await request(app)
      .post('/api/feedback')
      .send({ title: 'Something broke' });

    expect(res.status).toBe(400);
  });

  it('returns 400 when category is invalid', async () => {
    const res = await request(app)
      .post('/api/feedback')
      .send({ title: 'Something broke', category: 'complaint' });

    expect(res.status).toBe(400);
  });

  it('returns 400 when title exceeds 200 characters', async () => {
    const res = await request(app)
      .post('/api/feedback')
      .send({ title: 'A'.repeat(201), category: 'bug' });

    expect(res.status).toBe(400);
  });

  it('logs a feedback_created event', async () => {
    await request(app)
      .post('/api/feedback')
      .send({ title: 'Log test', category: 'other' });

    const events = db.prepare(
      `SELECT * FROM event_log WHERE event_type = 'feedback_created'`
    ).all();

    expect(events).toHaveLength(1);
  });
});

// ─── GET /api/feedback ────────────────────────────────────────────────────────

describe('GET /api/feedback', () => {
  let app: express.Express;
  let db: Database.Database;

  beforeEach(() => {
    ({ app, db } = createTestApp());
  });

  afterEach(() => {
    db.close();
  });

  it('returns empty array when no feedback exists', async () => {
    const res = await request(app).get('/api/feedback');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('returns feedback sorted by newest first with comment_count', async () => {
    const id1 = insertFeedback(db, { title: 'Older' });
    const id2 = insertFeedback(db, { title: 'Newer' });

    // Add a comment to the second one
    db.prepare(`INSERT INTO feedback_comments (feedback_id, body) VALUES (?, ?)`).run(id2, 'Nice!');

    const res = await request(app).get('/api/feedback');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);

    // Newest first: id2 > id1
    expect(res.body[0].id).toBe(id2);
    expect(res.body[0].comment_count).toBe(1);
    expect(res.body[1].id).toBe(id1);
    expect(res.body[1].comment_count).toBe(0);
  });

  it('filters by category', async () => {
    insertFeedback(db, { title: 'A bug', category: 'bug' });
    insertFeedback(db, { title: 'A feature', category: 'feature' });

    const res = await request(app).get('/api/feedback?category=bug');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].title).toBe('A bug');
  });

  it('filters by status', async () => {
    insertFeedback(db, { title: 'Open one', status: 'open' });
    insertFeedback(db, { title: 'Done one', status: 'done' });

    const res = await request(app).get('/api/feedback?status=done');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].title).toBe('Done one');
  });

  it('filters by category and status combined', async () => {
    insertFeedback(db, { title: 'Bug open', category: 'bug', status: 'open' });
    insertFeedback(db, { title: 'Bug done', category: 'bug', status: 'done' });
    insertFeedback(db, { title: 'Feature open', category: 'feature', status: 'open' });

    const res = await request(app).get('/api/feedback?category=bug&status=open');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].title).toBe('Bug open');
  });
});

// ─── GET /api/feedback/:id ────────────────────────────────────────────────────

describe('GET /api/feedback/:id', () => {
  let app: express.Express;
  let db: Database.Database;

  beforeEach(() => {
    ({ app, db } = createTestApp());
  });

  afterEach(() => {
    db.close();
  });

  it('returns feedback with its comments', async () => {
    const id = insertFeedback(db, { title: 'With comments' });
    db.prepare(`INSERT INTO feedback_comments (feedback_id, body) VALUES (?, ?)`).run(id, 'First comment');
    db.prepare(`INSERT INTO feedback_comments (feedback_id, body) VALUES (?, ?)`).run(id, 'Second comment');

    const res = await request(app).get(`/api/feedback/${id}`);
    expect(res.status).toBe(200);
    expect(res.body.title).toBe('With comments');
    expect(res.body.comments).toHaveLength(2);
    expect(res.body.comments[0].body).toBe('First comment');
    expect(res.body.comments[1].body).toBe('Second comment');
  });

  it('returns 404 for unknown id', async () => {
    const res = await request(app).get('/api/feedback/9999');
    expect(res.status).toBe(404);
  });
});

// ─── PUT /api/feedback/:id ────────────────────────────────────────────────────

describe('PUT /api/feedback/:id', () => {
  let app: express.Express;
  let db: Database.Database;

  beforeEach(() => {
    ({ app, db } = createTestApp());
  });

  afterEach(() => {
    db.close();
  });

  it('updates title and description', async () => {
    const id = insertFeedback(db, { title: 'Old title', description: 'Old desc' });

    const res = await request(app)
      .put(`/api/feedback/${id}`)
      .send({ title: 'New title', description: 'New desc' });

    expect(res.status).toBe(200);
    expect(res.body.title).toBe('New title');
    expect(res.body.description).toBe('New desc');
  });

  it('updates status and logs event', async () => {
    const id = insertFeedback(db, { status: 'open' });

    const res = await request(app)
      .put(`/api/feedback/${id}`)
      .send({ status: 'done' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('done');

    const events = db.prepare(
      `SELECT * FROM event_log WHERE event_type = 'feedback_status_changed'`
    ).all() as Array<Record<string, unknown>>;

    expect(events).toHaveLength(1);
    expect(events[0].old_value).toBe('open');
    expect(events[0].new_value).toBe('done');
  });

  it('returns 400 for invalid status', async () => {
    const id = insertFeedback(db);

    const res = await request(app)
      .put(`/api/feedback/${id}`)
      .send({ status: 'archived' });

    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid category', async () => {
    const id = insertFeedback(db);

    const res = await request(app)
      .put(`/api/feedback/${id}`)
      .send({ category: 'complaint' });

    expect(res.status).toBe(400);
  });

  it('returns 404 for unknown id', async () => {
    const res = await request(app)
      .put('/api/feedback/9999')
      .send({ title: 'Ghost' });

    expect(res.status).toBe(404);
  });
});

// ─── DELETE /api/feedback/:id ─────────────────────────────────────────────────

describe('DELETE /api/feedback/:id', () => {
  let app: express.Express;
  let db: Database.Database;

  beforeEach(() => {
    ({ app, db } = createTestApp());
  });

  afterEach(() => {
    db.close();
  });

  it('deletes feedback and cascades to comments', async () => {
    const id = insertFeedback(db, { title: 'To delete' });
    db.prepare(`INSERT INTO feedback_comments (feedback_id, body) VALUES (?, ?)`).run(id, 'orphaned comment');

    const res = await request(app).delete(`/api/feedback/${id}`);
    expect(res.status).toBe(204);

    const row = db.prepare(`SELECT * FROM feedback WHERE id = ?`).get(id);
    expect(row).toBeUndefined();

    const comments = db.prepare(`SELECT * FROM feedback_comments WHERE feedback_id = ?`).all(id);
    expect(comments).toHaveLength(0);
  });

  it('returns 404 for unknown id', async () => {
    const res = await request(app).delete('/api/feedback/9999');
    expect(res.status).toBe(404);
  });
});

// ─── POST /api/feedback/:id/comments ─────────────────────────────────────────

describe('POST /api/feedback/:id/comments', () => {
  let app: express.Express;
  let db: Database.Database;

  beforeEach(() => {
    ({ app, db } = createTestApp());
  });

  afterEach(() => {
    db.close();
  });

  it('adds a comment and returns it with 201', async () => {
    const id = insertFeedback(db);

    const res = await request(app)
      .post(`/api/feedback/${id}/comments`)
      .send({ body: 'Great idea!' });

    expect(res.status).toBe(201);
    expect(res.body.body).toBe('Great idea!');
    expect(res.body.feedback_id).toBe(id);
    expect(res.body.id).toBeTypeOf('number');
  });

  it('returns 400 when body is missing', async () => {
    const id = insertFeedback(db);

    const res = await request(app)
      .post(`/api/feedback/${id}/comments`)
      .send({});

    expect(res.status).toBe(400);
  });

  it('returns 400 when body exceeds 2000 characters', async () => {
    const id = insertFeedback(db);

    const res = await request(app)
      .post(`/api/feedback/${id}/comments`)
      .send({ body: 'B'.repeat(2001) });

    expect(res.status).toBe(400);
  });

  it('returns 404 when feedback does not exist', async () => {
    const res = await request(app)
      .post('/api/feedback/9999/comments')
      .send({ body: 'Hello?' });

    expect(res.status).toBe(404);
  });
});

// ─── PUT /api/feedback/comments/:id ──────────────────────────────────────────

describe('PUT /api/feedback/comments/:id', () => {
  let app: express.Express;
  let db: Database.Database;

  beforeEach(() => {
    ({ app, db } = createTestApp());
  });

  afterEach(() => {
    db.close();
  });

  it('updates comment body and sets updated_at', async () => {
    const feedbackId = insertFeedback(db);
    const { lastInsertRowid: commentId } = db.prepare(
      `INSERT INTO feedback_comments (feedback_id, body) VALUES (?, ?)`
    ).run(feedbackId, 'Original');

    const res = await request(app)
      .put(`/api/feedback/comments/${commentId}`)
      .send({ body: 'Updated text' });

    expect(res.status).toBe(200);
    expect(res.body.body).toBe('Updated text');
    expect(res.body.updated_at).not.toBeNull();
  });

  it('returns 400 when body is empty', async () => {
    const feedbackId = insertFeedback(db);
    const { lastInsertRowid: commentId } = db.prepare(
      `INSERT INTO feedback_comments (feedback_id, body) VALUES (?, ?)`
    ).run(feedbackId, 'Original');

    const res = await request(app)
      .put(`/api/feedback/comments/${commentId}`)
      .send({ body: '' });

    expect(res.status).toBe(400);
  });

  it('returns 404 for unknown comment', async () => {
    const res = await request(app)
      .put('/api/feedback/comments/9999')
      .send({ body: 'Hello?' });

    expect(res.status).toBe(404);
  });
});

// ─── DELETE /api/feedback/comments/:id ───────────────────────────────────────

describe('DELETE /api/feedback/comments/:id', () => {
  let app: express.Express;
  let db: Database.Database;

  beforeEach(() => {
    ({ app, db } = createTestApp());
  });

  afterEach(() => {
    db.close();
  });

  it('deletes the comment', async () => {
    const feedbackId = insertFeedback(db);
    const { lastInsertRowid: commentId } = db.prepare(
      `INSERT INTO feedback_comments (feedback_id, body) VALUES (?, ?)`
    ).run(feedbackId, 'To be deleted');

    const res = await request(app).delete(`/api/feedback/comments/${commentId}`);
    expect(res.status).toBe(204);

    const row = db.prepare(`SELECT * FROM feedback_comments WHERE id = ?`).get(commentId);
    expect(row).toBeUndefined();
  });

  it('returns 404 for unknown comment', async () => {
    const res = await request(app).delete('/api/feedback/comments/9999');
    expect(res.status).toBe(404);
  });
});
