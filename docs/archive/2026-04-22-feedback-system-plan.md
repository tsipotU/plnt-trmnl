# Feedback System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a single-user feedback system to plant-trmnl — capture bugs, ideas, and improvements from any page, with threaded comments and status tracking.

**Architecture:** Two new SQLite tables (`feedback`, `feedback_comments`) with `ON DELETE CASCADE`. One new Express router (`createFeedbackRouter`) mounted at `/api/feedback`. Three new React components: `FeedbackButton` (floating FAB + bottom sheet), `FeedbackList` (list page with filters), `FeedbackDetail` (detail page with comments). No user management — single-user app.

**Tech Stack:** Express 5, better-sqlite3 (sync), React 19, React Router v7, Vitest + Supertest, inline styles + CSS custom properties.

**Issue:** [#19](https://github.com/tsipotU/plant-trmnl/issues/19)

---

## File Structure

| Action | File | Responsibility |
|--------|------|----------------|
| Modify | `packages/api/src/database/schema.ts` | Add `feedback` + `feedback_comments` tables |
| Create | `packages/api/src/routes/feedback.ts` | All feedback + comment API routes |
| Create | `packages/api/src/routes/feedback.test.ts` | API tests (supertest + in-memory DB) |
| Modify | `packages/api/src/index.ts` | Mount feedback router |
| Create | `packages/api/client/src/components/FeedbackButton.tsx` | Floating FAB + submit bottom sheet |
| Create | `packages/api/client/src/pages/FeedbackList.tsx` | List page with category/status filters |
| Create | `packages/api/client/src/pages/FeedbackDetail.tsx` | Detail view with comments + inline edit |
| Modify | `packages/api/client/src/App.tsx` | Add routes, nav link, render FeedbackButton |

---

### Task 1: Add feedback tables to schema

**Files:**
- Modify: `packages/api/src/database/schema.ts`

- [ ] **Step 1: Add the `feedback` table**

Add this block at the end of `initializeSchema()`, before the closing `}`:

```ts
  db.prepare(`
    CREATE TABLE IF NOT EXISTS feedback (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      category TEXT NOT NULL CHECK(category IN ('bug', 'feature', 'improvement', 'other')),
      page_path TEXT,
      status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open', 'in_progress', 'done', 'wont_fix')),
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT
    )
  `).run();
```

- [ ] **Step 2: Add the `feedback_comments` table**

Add this block immediately after the `feedback` table:

```ts
  db.prepare(`
    CREATE TABLE IF NOT EXISTS feedback_comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      feedback_id INTEGER NOT NULL REFERENCES feedback(id) ON DELETE CASCADE,
      body TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT
    )
  `).run();
```

- [ ] **Step 3: Verify schema loads**

Run: `cd packages/api && npx vitest run --reporter=verbose 2>&1 | head -30`

Expected: All existing tests still pass (schema is additive — no migration needed).

- [ ] **Step 4: Commit**

```bash
git add packages/api/src/database/schema.ts
git commit -m "feat(db): add feedback and feedback_comments tables"
```

---

### Task 2: Feedback CRUD API — tests first

**Files:**
- Create: `packages/api/src/routes/feedback.test.ts`
- Create: `packages/api/src/routes/feedback.ts`

- [ ] **Step 1: Write tests for feedback CRUD**

Create `packages/api/src/routes/feedback.test.ts`:

```ts
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

// --- POST /api/feedback ---

describe('POST /api/feedback', () => {
  let app: express.Express;
  let db: Database.Database;

  beforeEach(() => {
    ({ app, db } = createTestApp());
  });
  afterEach(() => db.close());

  it('creates feedback and returns it with 201', async () => {
    const res = await request(app)
      .post('/api/feedback')
      .send({ title: 'Bug report', description: 'Something broke', category: 'bug', pagePath: '/plants/1' });

    expect(res.status).toBe(201);
    expect(res.body.title).toBe('Bug report');
    expect(res.body.description).toBe('Something broke');
    expect(res.body.category).toBe('bug');
    expect(res.body.page_path).toBe('/plants/1');
    expect(res.body.status).toBe('open');
    expect(res.body.id).toBeTypeOf('number');
  });

  it('creates feedback without description (optional)', async () => {
    const res = await request(app)
      .post('/api/feedback')
      .send({ title: 'Quick idea', category: 'feature' });

    expect(res.status).toBe(201);
    expect(res.body.description).toBeNull();
  });

  it('returns 400 when title is missing', async () => {
    const res = await request(app)
      .post('/api/feedback')
      .send({ category: 'bug' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/title/i);
  });

  it('returns 400 when category is missing', async () => {
    const res = await request(app)
      .post('/api/feedback')
      .send({ title: 'No category' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/category/i);
  });

  it('returns 400 when category is invalid', async () => {
    const res = await request(app)
      .post('/api/feedback')
      .send({ title: 'Bad cat', category: 'invalid' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/category/i);
  });

  it('returns 400 when title exceeds 200 characters', async () => {
    const res = await request(app)
      .post('/api/feedback')
      .send({ title: 'x'.repeat(201), category: 'bug' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/title/i);
  });

  it('logs a feedback_created event', async () => {
    await request(app)
      .post('/api/feedback')
      .send({ title: 'Logged', category: 'feature' });

    const event = db.prepare(
      `SELECT * FROM event_log WHERE event_type = 'feedback_created'`
    ).get() as Record<string, unknown>;

    expect(event).toBeDefined();
    expect(event.new_value).toBe('Logged');
  });
});

// --- GET /api/feedback ---

describe('GET /api/feedback', () => {
  let app: express.Express;
  let db: Database.Database;

  beforeEach(() => {
    ({ app, db } = createTestApp());
  });
  afterEach(() => db.close());

  it('returns empty array when no feedback exists', async () => {
    const res = await request(app).get('/api/feedback');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('returns feedback sorted by newest first with comment_count', async () => {
    const id1 = insertFeedback(db, { title: 'First' });
    const id2 = insertFeedback(db, { title: 'Second' });
    // Add a comment to the first item
    db.prepare(
      `INSERT INTO feedback_comments (feedback_id, body) VALUES (?, 'A comment')`
    ).run(id1);

    const res = await request(app).get('/api/feedback');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].title).toBe('Second'); // newest first
    expect(res.body[1].title).toBe('First');
    expect(res.body[1].comment_count).toBe(1);
    expect(res.body[0].comment_count).toBe(0);
  });

  it('filters by category', async () => {
    insertFeedback(db, { title: 'Bug', category: 'bug' });
    insertFeedback(db, { title: 'Feature', category: 'feature' });

    const res = await request(app).get('/api/feedback?category=bug');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].title).toBe('Bug');
  });

  it('filters by status', async () => {
    insertFeedback(db, { title: 'Open', status: 'open' });
    insertFeedback(db, { title: 'Done', status: 'done' });

    const res = await request(app).get('/api/feedback?status=done');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].title).toBe('Done');
  });

  it('filters by category and status combined', async () => {
    insertFeedback(db, { title: 'Open Bug', category: 'bug', status: 'open' });
    insertFeedback(db, { title: 'Done Bug', category: 'bug', status: 'done' });
    insertFeedback(db, { title: 'Open Feature', category: 'feature', status: 'open' });

    const res = await request(app).get('/api/feedback?category=bug&status=open');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].title).toBe('Open Bug');
  });
});

// --- GET /api/feedback/:id ---

describe('GET /api/feedback/:id', () => {
  let app: express.Express;
  let db: Database.Database;

  beforeEach(() => {
    ({ app, db } = createTestApp());
  });
  afterEach(() => db.close());

  it('returns feedback with its comments', async () => {
    const fbId = insertFeedback(db, { title: 'With comments' });
    db.prepare(
      `INSERT INTO feedback_comments (feedback_id, body) VALUES (?, 'First comment')`
    ).run(fbId);
    db.prepare(
      `INSERT INTO feedback_comments (feedback_id, body) VALUES (?, 'Second comment')`
    ).run(fbId);

    const res = await request(app).get(`/api/feedback/${fbId}`);
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

// --- PUT /api/feedback/:id ---

describe('PUT /api/feedback/:id', () => {
  let app: express.Express;
  let db: Database.Database;

  beforeEach(() => {
    ({ app, db } = createTestApp());
  });
  afterEach(() => db.close());

  it('updates title and description', async () => {
    const fbId = insertFeedback(db);

    const res = await request(app)
      .put(`/api/feedback/${fbId}`)
      .send({ title: 'Updated title', description: 'Updated desc' });

    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Updated title');
    expect(res.body.description).toBe('Updated desc');
    expect(res.body.updated_at).toBeTruthy();
  });

  it('updates status and logs event', async () => {
    const fbId = insertFeedback(db);

    const res = await request(app)
      .put(`/api/feedback/${fbId}`)
      .send({ status: 'in_progress' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('in_progress');

    const event = db.prepare(
      `SELECT * FROM event_log WHERE event_type = 'feedback_status_changed'`
    ).get() as Record<string, unknown>;
    expect(event).toBeDefined();
    expect(event.old_value).toBe('open');
    expect(event.new_value).toBe('in_progress');
  });

  it('returns 400 for invalid status', async () => {
    const fbId = insertFeedback(db);

    const res = await request(app)
      .put(`/api/feedback/${fbId}`)
      .send({ status: 'bogus' });

    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid category', async () => {
    const fbId = insertFeedback(db);

    const res = await request(app)
      .put(`/api/feedback/${fbId}`)
      .send({ category: 'bogus' });

    expect(res.status).toBe(400);
  });

  it('returns 404 for unknown id', async () => {
    const res = await request(app)
      .put('/api/feedback/9999')
      .send({ title: 'Nope' });

    expect(res.status).toBe(404);
  });
});

// --- DELETE /api/feedback/:id ---

describe('DELETE /api/feedback/:id', () => {
  let app: express.Express;
  let db: Database.Database;

  beforeEach(() => {
    ({ app, db } = createTestApp());
  });
  afterEach(() => db.close());

  it('deletes feedback and cascades to comments', async () => {
    const fbId = insertFeedback(db);
    db.prepare(
      `INSERT INTO feedback_comments (feedback_id, body) VALUES (?, 'Will be deleted')`
    ).run(fbId);

    const res = await request(app).delete(`/api/feedback/${fbId}`);
    expect(res.status).toBe(204);

    const row = db.prepare(`SELECT * FROM feedback WHERE id = ?`).get(fbId);
    expect(row).toBeUndefined();

    const comments = db.prepare(`SELECT * FROM feedback_comments WHERE feedback_id = ?`).all(fbId);
    expect(comments).toHaveLength(0);
  });

  it('returns 404 for unknown id', async () => {
    const res = await request(app).delete('/api/feedback/9999');
    expect(res.status).toBe(404);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd packages/api && npx vitest run src/routes/feedback.test.ts --reporter=verbose 2>&1 | tail -20`

Expected: FAIL — `Cannot find module './feedback.js'`

- [ ] **Step 3: Implement the feedback CRUD router**

Create `packages/api/src/routes/feedback.ts`:

```ts
import { Router, Request, Response } from 'express';
import type Database from 'better-sqlite3';
import { logEvent } from '../database/event-log.js';

const VALID_CATEGORIES = ['bug', 'feature', 'improvement', 'other'];
const VALID_STATUSES = ['open', 'in_progress', 'done', 'wont_fix'];

export function createFeedbackRouter(db: Database.Database): Router {
  const router = Router();

  // GET /api/feedback — list all with comment count, optional filters
  router.get('/', (req: Request, res: Response) => {
    const { category, status } = req.query;

    let sql = `
      SELECT f.*, COUNT(c.id) AS comment_count
      FROM feedback f
      LEFT JOIN feedback_comments c ON c.feedback_id = f.id
    `;
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (category && typeof category === 'string' && VALID_CATEGORIES.includes(category)) {
      conditions.push('f.category = ?');
      params.push(category);
    }
    if (status && typeof status === 'string' && VALID_STATUSES.includes(status)) {
      conditions.push('f.status = ?');
      params.push(status);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' GROUP BY f.id ORDER BY f.created_at DESC';

    const rows = db.prepare(sql).all(...params);
    res.json(rows);
  });

  // GET /api/feedback/:id — single item with comments
  router.get('/:id', (req: Request, res: Response) => {
    const feedback = db.prepare(`SELECT * FROM feedback WHERE id = ?`).get(req.params.id) as Record<string, unknown> | undefined;

    if (!feedback) {
      res.status(404).json({ error: 'Feedback not found' });
      return;
    }

    const comments = db.prepare(
      `SELECT * FROM feedback_comments WHERE feedback_id = ? ORDER BY created_at ASC`
    ).all(req.params.id);

    res.json({ ...feedback, comments });
  });

  // POST /api/feedback — create
  router.post('/', (req: Request, res: Response) => {
    const { title, description, category, pagePath } = req.body;

    if (!title || typeof title !== 'string' || !title.trim()) {
      res.status(400).json({ error: 'title is required' });
      return;
    }
    if (title.trim().length > 200) {
      res.status(400).json({ error: 'title must be 200 characters or fewer' });
      return;
    }
    if (!category || !VALID_CATEGORIES.includes(category)) {
      res.status(400).json({ error: `category must be one of: ${VALID_CATEGORIES.join(', ')}` });
      return;
    }

    const result = db.prepare(
      `INSERT INTO feedback (title, description, category, page_path)
       VALUES (?, ?, ?, ?)`
    ).run(title.trim(), description?.trim() || null, category, pagePath || null);

    const feedback = db.prepare(`SELECT * FROM feedback WHERE id = ?`).get(result.lastInsertRowid);

    logEvent(db, {
      plantId: null,
      eventType: 'feedback_created',
      newValue: title.trim(),
      reason: `Feedback submitted: ${category}`,
    });

    res.status(201).json(feedback);
  });

  // PUT /api/feedback/:id — update
  router.put('/:id', (req: Request, res: Response) => {
    const fbId = Number(req.params.id);
    const existing = db.prepare(`SELECT * FROM feedback WHERE id = ?`).get(fbId) as Record<string, unknown> | undefined;

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
    if (title !== undefined && typeof title === 'string' && title.trim().length > 200) {
      res.status(400).json({ error: 'title must be 200 characters or fewer' });
      return;
    }

    // Log status change before updating
    if (status !== undefined && status !== existing.status) {
      logEvent(db, {
        plantId: null,
        eventType: 'feedback_status_changed',
        oldValue: existing.status as string,
        newValue: status,
        reason: `Feedback #${fbId} status changed`,
      });
    }

    db.prepare(
      `UPDATE feedback SET
         title       = COALESCE(?, title),
         description = COALESCE(?, description),
         category    = COALESCE(?, category),
         status      = COALESCE(?, status),
         updated_at  = datetime('now')
       WHERE id = ?`
    ).run(
      title?.trim() ?? null,
      description?.trim() ?? null,
      category ?? null,
      status ?? null,
      fbId
    );

    const updated = db.prepare(`SELECT * FROM feedback WHERE id = ?`).get(fbId);
    res.json(updated);
  });

  // DELETE /api/feedback/:id
  router.delete('/:id', (req: Request, res: Response) => {
    const fbId = Number(req.params.id);
    const existing = db.prepare(`SELECT * FROM feedback WHERE id = ?`).get(fbId);

    if (!existing) {
      res.status(404).json({ error: 'Feedback not found' });
      return;
    }

    db.prepare(`DELETE FROM feedback WHERE id = ?`).run(fbId);
    res.status(204).send();
  });

  return router;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd packages/api && npx vitest run src/routes/feedback.test.ts --reporter=verbose`

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/api/src/routes/feedback.ts packages/api/src/routes/feedback.test.ts
git commit -m "feat(api): feedback CRUD with TDD — create, list, detail, update, delete"
```

---

### Task 3: Comments API — tests first

**Files:**
- Modify: `packages/api/src/routes/feedback.test.ts`
- Modify: `packages/api/src/routes/feedback.ts`

- [ ] **Step 1: Add comment tests**

Append these test blocks to the end of `feedback.test.ts`:

```ts
// --- POST /api/feedback/:id/comments ---

describe('POST /api/feedback/:id/comments', () => {
  let app: express.Express;
  let db: Database.Database;

  beforeEach(() => {
    ({ app, db } = createTestApp());
  });
  afterEach(() => db.close());

  it('adds a comment and returns it with 201', async () => {
    const fbId = insertFeedback(db);

    const res = await request(app)
      .post(`/api/feedback/${fbId}/comments`)
      .send({ body: 'Great idea!' });

    expect(res.status).toBe(201);
    expect(res.body.body).toBe('Great idea!');
    expect(res.body.feedback_id).toBe(fbId);
    expect(res.body.id).toBeTypeOf('number');
  });

  it('returns 400 when body is missing', async () => {
    const fbId = insertFeedback(db);

    const res = await request(app)
      .post(`/api/feedback/${fbId}/comments`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/body/i);
  });

  it('returns 400 when body exceeds 2000 characters', async () => {
    const fbId = insertFeedback(db);

    const res = await request(app)
      .post(`/api/feedback/${fbId}/comments`)
      .send({ body: 'x'.repeat(2001) });

    expect(res.status).toBe(400);
  });

  it('returns 404 when feedback does not exist', async () => {
    const res = await request(app)
      .post('/api/feedback/9999/comments')
      .send({ body: 'Orphan comment' });

    expect(res.status).toBe(404);
  });
});

// --- PUT /api/feedback/comments/:id ---

describe('PUT /api/feedback/comments/:id', () => {
  let app: express.Express;
  let db: Database.Database;

  beforeEach(() => {
    ({ app, db } = createTestApp());
  });
  afterEach(() => db.close());

  it('updates comment body and sets updated_at', async () => {
    const fbId = insertFeedback(db);
    const { lastInsertRowid: commentId } = db.prepare(
      `INSERT INTO feedback_comments (feedback_id, body) VALUES (?, 'Original')`
    ).run(fbId);

    const res = await request(app)
      .put(`/api/feedback/comments/${commentId}`)
      .send({ body: 'Edited' });

    expect(res.status).toBe(200);
    expect(res.body.body).toBe('Edited');
    expect(res.body.updated_at).toBeTruthy();
  });

  it('returns 400 when body is empty', async () => {
    const fbId = insertFeedback(db);
    const { lastInsertRowid: commentId } = db.prepare(
      `INSERT INTO feedback_comments (feedback_id, body) VALUES (?, 'Original')`
    ).run(fbId);

    const res = await request(app)
      .put(`/api/feedback/comments/${commentId}`)
      .send({ body: '   ' });

    expect(res.status).toBe(400);
  });

  it('returns 404 for unknown comment', async () => {
    const res = await request(app)
      .put('/api/feedback/comments/9999')
      .send({ body: 'Nope' });

    expect(res.status).toBe(404);
  });
});

// --- DELETE /api/feedback/comments/:id ---

describe('DELETE /api/feedback/comments/:id', () => {
  let app: express.Express;
  let db: Database.Database;

  beforeEach(() => {
    ({ app, db } = createTestApp());
  });
  afterEach(() => db.close());

  it('deletes the comment', async () => {
    const fbId = insertFeedback(db);
    const { lastInsertRowid: commentId } = db.prepare(
      `INSERT INTO feedback_comments (feedback_id, body) VALUES (?, 'To delete')`
    ).run(fbId);

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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd packages/api && npx vitest run src/routes/feedback.test.ts --reporter=verbose 2>&1 | tail -20`

Expected: FAIL — new comment route tests fail (routes don't exist yet).

- [ ] **Step 3: Add comment routes to the feedback router**

Add these routes inside `createFeedbackRouter`, before the `return router;` line in `packages/api/src/routes/feedback.ts`:

```ts
  // POST /api/feedback/:id/comments — add a comment
  router.post('/:id/comments', (req: Request, res: Response) => {
    const fbId = Number(req.params.id);
    const existing = db.prepare(`SELECT * FROM feedback WHERE id = ?`).get(fbId);

    if (!existing) {
      res.status(404).json({ error: 'Feedback not found' });
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

    const result = db.prepare(
      `INSERT INTO feedback_comments (feedback_id, body) VALUES (?, ?)`
    ).run(fbId, body.trim());

    const comment = db.prepare(`SELECT * FROM feedback_comments WHERE id = ?`).get(result.lastInsertRowid);
    res.status(201).json(comment);
  });

  // PUT /api/feedback/comments/:id — edit a comment
  router.put('/comments/:id', (req: Request, res: Response) => {
    const commentId = Number(req.params.id);
    const existing = db.prepare(`SELECT * FROM feedback_comments WHERE id = ?`).get(commentId);

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
    const existing = db.prepare(`SELECT * FROM feedback_comments WHERE id = ?`).get(commentId);

    if (!existing) {
      res.status(404).json({ error: 'Comment not found' });
      return;
    }

    db.prepare(`DELETE FROM feedback_comments WHERE id = ?`).run(commentId);
    res.status(204).send();
  });
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd packages/api && npx vitest run src/routes/feedback.test.ts --reporter=verbose`

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/api/src/routes/feedback.ts packages/api/src/routes/feedback.test.ts
git commit -m "feat(api): feedback comments — add, edit, delete with TDD"
```

---

### Task 4: Mount feedback router in index.ts

**Files:**
- Modify: `packages/api/src/index.ts`

- [ ] **Step 1: Add import and mount the router**

Add the import with the other router imports (after the `createEnrichmentRouter` import):

```ts
import { createFeedbackRouter } from './routes/feedback.js';
```

Add the route mount after the enrichment router line (`app.use('/api/enrichment', ...)`):

```ts
app.use('/api/feedback', createFeedbackRouter(db));
```

- [ ] **Step 2: Run full test suite to verify nothing is broken**

Run: `cd packages/api && npx vitest run --reporter=verbose 2>&1 | tail -10`

Expected: All tests PASS.

- [ ] **Step 3: Commit**

```bash
git add packages/api/src/index.ts
git commit -m "feat(api): mount feedback router at /api/feedback"
```

---

### Task 5: FeedbackButton component (floating FAB + submit sheet)

**Files:**
- Create: `packages/api/client/src/components/FeedbackButton.tsx`

- [ ] **Step 1: Create the FeedbackButton component**

Create `packages/api/client/src/components/FeedbackButton.tsx`:

```tsx
import { useState } from 'react';
import { useLocation } from 'react-router-dom';

const CATEGORIES = [
  { value: 'bug', label: 'Bug' },
  { value: 'feature', label: 'Feature' },
  { value: 'improvement', label: 'Improvement' },
  { value: 'other', label: 'Other' },
];

export function FeedbackButton() {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function handleOpen() {
    setOpen(true);
    setTitle('');
    setDescription('');
    setCategory('');
    setError(null);
    setSuccess(false);
  }

  function handleClose() {
    if (!submitting) setOpen(false);
  }

  async function handleSubmit() {
    if (!title.trim()) {
      setError('Title is required');
      return;
    }
    if (!category) {
      setError('Category is required');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          category,
          pagePath: location.pathname,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? `Server error (${res.status})`);
      }
      setSuccess(true);
      setTimeout(() => setOpen(false), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      {/* Floating action button */}
      <button
        onClick={handleOpen}
        aria-label="Send feedback"
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          width: 52,
          height: 52,
          borderRadius: '50%',
          background: 'var(--accent)',
          color: 'white',
          fontSize: 24,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
          zIndex: 50,
          border: 'none',
          cursor: 'pointer',
          padding: 0,
          minWidth: 52,
          minHeight: 52,
        }}
      >
        💬
      </button>

      {/* Bottom sheet */}
      {open && (
        <div
          onClick={handleClose}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--bg-secondary)',
              borderRadius: '16px 16px 0 0',
              padding: '20px 16px 32px',
              width: '100%',
              maxWidth: 430,
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
            }}
            role="dialog"
            aria-modal="true"
            aria-label="Submit feedback"
          >
            {/* Handle + header */}
            <div style={{ textAlign: 'center' }}>
              <div
                style={{
                  width: 36,
                  height: 4,
                  borderRadius: 2,
                  background: 'var(--border)',
                  margin: '0 auto 16px',
                }}
              />
              <h2 style={{ fontSize: 18, fontWeight: 700 }}>Send Feedback</h2>
            </div>

            {success ? (
              <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--accent)', fontSize: 16, fontWeight: 600 }}>
                Feedback submitted!
              </div>
            ) : (
              <>
                {/* Error */}
                {error && (
                  <div
                    style={{
                      background: 'rgba(231, 76, 60, 0.1)',
                      border: '1px solid var(--danger)',
                      borderRadius: 6,
                      padding: '10px 12px',
                      color: 'var(--danger)',
                      fontSize: 14,
                    }}
                  >
                    {error}
                  </div>
                )}

                {/* Category */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>
                    Category *
                  </label>
                  <div
                    style={{
                      display: 'flex',
                      border: '1px solid var(--border)',
                      borderRadius: 8,
                      overflow: 'hidden',
                    }}
                    role="group"
                    aria-label="Category"
                  >
                    {CATEGORIES.map((cat, i) => {
                      const isActive = category === cat.value;
                      return (
                        <button
                          key={cat.value}
                          onClick={() => setCategory(cat.value)}
                          style={{
                            flex: 1,
                            background: isActive ? 'var(--accent)' : 'var(--bg-card)',
                            color: isActive ? '#fff' : 'var(--text-secondary)',
                            border: 'none',
                            borderLeft: i > 0 ? '1px solid var(--border)' : 'none',
                            borderRadius: 0,
                            fontWeight: isActive ? 600 : 400,
                            fontSize: 13,
                            minHeight: 44,
                            padding: '10px 0',
                            cursor: 'pointer',
                          }}
                          aria-pressed={isActive}
                        >
                          {cat.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Title */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>
                    Title *
                  </label>
                  <input
                    type="text"
                    placeholder="What's on your mind?"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    maxLength={200}
                    autoFocus
                  />
                </div>

                {/* Description */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>
                    Description
                    <span style={{ fontWeight: 400, marginLeft: 4 }}>(optional)</span>
                  </label>
                  <textarea
                    placeholder="Any details..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    style={{
                      background: 'var(--bg-card)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border)',
                      padding: 12,
                      borderRadius: 'var(--radius)',
                      fontSize: 16,
                      width: '100%',
                      resize: 'vertical',
                      fontFamily: 'inherit',
                    }}
                  />
                </div>

                {/* Page path (read-only) */}
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                  Page: {location.pathname}
                </div>

                {/* Action buttons */}
                <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                  <button
                    onClick={handleClose}
                    disabled={submitting}
                    style={{
                      flex: 1,
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border)',
                      color: 'var(--text-secondary)',
                      fontSize: 16,
                      minHeight: 48,
                      borderRadius: 8,
                      cursor: submitting ? 'not-allowed' : 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={submitting || !title.trim() || !category}
                    style={{
                      flex: 2,
                      background: submitting || !title.trim() || !category ? 'rgba(0,168,107,0.4)' : 'var(--accent)',
                      color: '#fff',
                      fontSize: 16,
                      fontWeight: 600,
                      minHeight: 48,
                      borderRadius: 8,
                      cursor: submitting || !title.trim() || !category ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {submitting ? 'Submitting...' : 'Submit'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/api/client/src/components/FeedbackButton.tsx
git commit -m "feat(client): FeedbackButton — floating FAB with submit bottom sheet"
```

---

### Task 6: FeedbackList page

**Files:**
- Create: `packages/api/client/src/pages/FeedbackList.tsx`

- [ ] **Step 1: Create the FeedbackList page**

Create `packages/api/client/src/pages/FeedbackList.tsx`:

```tsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

interface FeedbackItem {
  id: number;
  title: string;
  description: string | null;
  category: string;
  status: string;
  page_path: string | null;
  comment_count: number;
  created_at: string;
}

const CATEGORIES = ['bug', 'feature', 'improvement', 'other'];
const STATUSES = ['open', 'in_progress', 'done', 'wont_fix'];

const STATUS_LABELS: Record<string, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  done: 'Done',
  wont_fix: "Won't Fix",
};

const CATEGORY_COLORS: Record<string, string> = {
  bug: 'var(--danger)',
  feature: 'var(--accent)',
  improvement: 'var(--warning)',
  other: 'var(--text-secondary)',
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export function FeedbackList() {
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams();
    if (filterCategory) params.set('category', filterCategory);
    if (filterStatus) params.set('status', filterStatus);
    const qs = params.toString();

    setLoading(true);
    fetch(`/api/feedback${qs ? `?${qs}` : ''}`)
      .then((r) => r.json())
      .then((data) => {
        setItems(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [filterCategory, filterStatus]);

  const hasFilters = filterCategory !== null || filterStatus !== null;

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-secondary)' }}>
        Loading…
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: 48, color: 'var(--danger)' }}>
        {error}
      </div>
    );
  }

  return (
    <div style={{ paddingBottom: 80 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 16 }}>Feedback</h1>

      {/* Filters */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Category filter */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)', minWidth: 60 }}>Category:</span>
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setFilterCategory(filterCategory === cat ? null : cat)}
                style={{
                  background: filterCategory === cat ? CATEGORY_COLORS[cat] : 'var(--bg-secondary)',
                  color: filterCategory === cat ? '#fff' : 'var(--text-secondary)',
                  fontSize: 12,
                  padding: '4px 10px',
                  borderRadius: 12,
                  minHeight: 28,
                  minWidth: 0,
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Status filter */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)', minWidth: 60 }}>Status:</span>
            {STATUSES.map((s) => (
              <button
                key={s}
                onClick={() => setFilterStatus(filterStatus === s ? null : s)}
                style={{
                  background: filterStatus === s ? 'var(--accent)' : 'var(--bg-secondary)',
                  color: filterStatus === s ? '#fff' : 'var(--text-secondary)',
                  fontSize: 12,
                  padding: '4px 10px',
                  borderRadius: 12,
                  minHeight: 28,
                  minWidth: 0,
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                {STATUS_LABELS[s]}
              </button>
            ))}
          </div>

          {/* Clear filters */}
          {hasFilters && (
            <button
              onClick={() => { setFilterCategory(null); setFilterStatus(null); }}
              style={{
                background: 'transparent',
                color: 'var(--accent)',
                fontSize: 12,
                padding: '4px 0',
                minHeight: 28,
                minWidth: 0,
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              Clear filters ({items.length} result{items.length !== 1 ? 's' : ''})
            </button>
          )}
        </div>
      </div>

      {/* List */}
      {items.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 32 }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: 15, marginBottom: 8 }}>
            {hasFilters ? 'No matching feedback' : 'No feedback yet'}
          </p>
          {!hasFilters && (
            <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
              Use the 💬 button to share your first idea
            </p>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {items.map((item) => (
            <Link
              key={item.id}
              to={`/feedback/${item.id}`}
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              <div className="card" style={{ padding: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <span
                        style={{
                          background: CATEGORY_COLORS[item.category],
                          color: '#fff',
                          fontSize: 10,
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: 10,
                          textTransform: 'uppercase',
                          flexShrink: 0,
                        }}
                      >
                        {item.category}
                      </span>
                      <span
                        style={{
                          fontSize: 11,
                          color: 'var(--text-secondary)',
                          flexShrink: 0,
                        }}
                      >
                        {STATUS_LABELS[item.status]}
                      </span>
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.title}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                      {formatDate(item.created_at)}
                      {item.comment_count > 0 && (
                        <span style={{ marginLeft: 8 }}>
                          💬 {item.comment_count}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/api/client/src/pages/FeedbackList.tsx
git commit -m "feat(client): FeedbackList page with category/status filters"
```

---

### Task 7: FeedbackDetail page with comments

**Files:**
- Create: `packages/api/client/src/pages/FeedbackDetail.tsx`

- [ ] **Step 1: Create the FeedbackDetail page**

Create `packages/api/client/src/pages/FeedbackDetail.tsx`:

```tsx
import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

interface Feedback {
  id: number;
  title: string;
  description: string | null;
  category: string;
  status: string;
  page_path: string | null;
  created_at: string;
  updated_at: string | null;
  comments: Comment[];
}

interface Comment {
  id: number;
  feedback_id: number;
  body: string;
  created_at: string;
  updated_at: string | null;
}

const CATEGORIES = [
  { value: 'bug', label: 'Bug' },
  { value: 'feature', label: 'Feature' },
  { value: 'improvement', label: 'Improvement' },
  { value: 'other', label: 'Other' },
];

const STATUSES = [
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'done', label: 'Done' },
  { value: 'wont_fix', label: "Won't Fix" },
];

const CATEGORY_COLORS: Record<string, string> = {
  bug: 'var(--danger)',
  feature: 'var(--accent)',
  improvement: 'var(--warning)',
  other: 'var(--text-secondary)',
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

// --- Toast ---

function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3000);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'var(--accent)',
        color: 'white',
        padding: '12px 20px',
        borderRadius: 'var(--radius)',
        fontSize: 14,
        fontWeight: 600,
        zIndex: 200,
        maxWidth: '90vw',
        textAlign: 'center',
        boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
      }}
    >
      {message}
    </div>
  );
}

// --- Confirm Dialog ---

function ConfirmDialog({
  message,
  onConfirm,
  onCancel,
}: {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.7)',
        zIndex: 150,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <div
        className="card"
        style={{ width: '100%', maxWidth: 360, textAlign: 'center', padding: 24 }}
      >
        <p style={{ fontSize: 16, marginBottom: 24, lineHeight: 1.5 }}>{message}</p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <button
            onClick={onCancel}
            style={{ flex: 1, background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{ flex: 1, background: 'var(--danger)' }}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Main ---

export function FeedbackDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Edit state
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editCategory, setEditCategory] = useState('');

  // Comment state
  const [commentBody, setCommentBody] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editCommentBody, setEditCommentBody] = useState('');

  // Delete confirm
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmDeleteCommentId, setConfirmDeleteCommentId] = useState<number | null>(null);

  const showToast = useCallback((msg: string) => setToast(msg), []);

  function fetchFeedback() {
    if (!id) return;
    setLoading(true);
    fetch(`/api/feedback/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error('Not found');
        return r.json();
      })
      .then((data) => {
        setFeedback(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }

  useEffect(() => {
    fetchFeedback();
  }, [id]);

  // --- Status change ---
  async function handleStatusChange(newStatus: string) {
    if (!id) return;
    try {
      const res = await fetch(`/api/feedback/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error('Update failed');
      const updated = await res.json();
      setFeedback((prev) => prev ? { ...prev, ...updated, comments: prev.comments } : prev);
      showToast(`Status changed to ${STATUSES.find((s) => s.value === newStatus)?.label}`);
    } catch {
      showToast('Failed to update status');
    }
  }

  // --- Edit ---
  function startEdit() {
    if (!feedback) return;
    setEditTitle(feedback.title);
    setEditDescription(feedback.description ?? '');
    setEditCategory(feedback.category);
    setEditing(true);
  }

  async function saveEdit() {
    if (!id) return;
    try {
      const res = await fetch(`/api/feedback/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editTitle.trim(),
          description: editDescription.trim() || null,
          category: editCategory,
        }),
      });
      if (!res.ok) throw new Error('Update failed');
      const updated = await res.json();
      setFeedback((prev) => prev ? { ...prev, ...updated, comments: prev.comments } : prev);
      setEditing(false);
      showToast('Feedback updated');
    } catch {
      showToast('Failed to update');
    }
  }

  // --- Delete feedback ---
  async function handleDelete() {
    if (!id) return;
    try {
      await fetch(`/api/feedback/${id}`, { method: 'DELETE' });
      showToast('Feedback deleted');
      setTimeout(() => navigate('/feedback'), 1000);
    } catch {
      showToast('Failed to delete');
    }
    setConfirmDelete(false);
  }

  // --- Add comment ---
  async function handleAddComment() {
    if (!id || !commentBody.trim()) return;
    setSubmittingComment(true);
    try {
      const res = await fetch(`/api/feedback/${id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: commentBody.trim() }),
      });
      if (!res.ok) throw new Error('Failed to add comment');
      const comment = await res.json();
      setFeedback((prev) =>
        prev ? { ...prev, comments: [...prev.comments, comment] } : prev
      );
      setCommentBody('');
    } catch {
      showToast('Failed to add comment');
    } finally {
      setSubmittingComment(false);
    }
  }

  // --- Edit comment ---
  function startEditComment(comment: Comment) {
    setEditingCommentId(comment.id);
    setEditCommentBody(comment.body);
  }

  async function saveEditComment() {
    if (editingCommentId === null) return;
    try {
      const res = await fetch(`/api/feedback/comments/${editingCommentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: editCommentBody.trim() }),
      });
      if (!res.ok) throw new Error('Edit failed');
      const updated = await res.json();
      setFeedback((prev) =>
        prev
          ? { ...prev, comments: prev.comments.map((c) => (c.id === updated.id ? updated : c)) }
          : prev
      );
      setEditingCommentId(null);
    } catch {
      showToast('Failed to edit comment');
    }
  }

  // --- Delete comment ---
  async function handleDeleteComment(commentId: number) {
    try {
      await fetch(`/api/feedback/comments/${commentId}`, { method: 'DELETE' });
      setFeedback((prev) =>
        prev
          ? { ...prev, comments: prev.comments.filter((c) => c.id !== commentId) }
          : prev
      );
    } catch {
      showToast('Failed to delete comment');
    }
    setConfirmDeleteCommentId(null);
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-secondary)' }}>
        Loading…
      </div>
    );
  }

  if (error || !feedback) {
    return (
      <div style={{ textAlign: 'center', padding: 48 }}>
        <p style={{ color: 'var(--danger)', marginBottom: 16 }}>
          {error ?? 'Feedback not found'}
        </p>
        <button
          onClick={() => navigate('/feedback')}
          style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
        >
          ← Back
        </button>
      </div>
    );
  }

  return (
    <div style={{ paddingBottom: 32 }}>
      {/* Back button */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <button
          onClick={() => navigate('/feedback')}
          style={{
            background: 'transparent',
            color: 'var(--text-secondary)',
            padding: '8px 4px',
            fontSize: 20,
            minWidth: 44,
            minHeight: 44,
          }}
          aria-label="Back to feedback list"
        >
          ←
        </button>
        <span style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Feedback</span>
      </div>

      {/* Main card */}
      <div className="card" style={{ marginBottom: 12 }}>
        {editing ? (
          /* Edit form */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Title</label>
              <input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                maxLength={200}
                autoFocus
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Description</label>
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={3}
                style={{
                  background: 'var(--bg-card)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border)',
                  padding: 12,
                  borderRadius: 'var(--radius)',
                  fontSize: 16,
                  width: '100%',
                  resize: 'vertical',
                  fontFamily: 'inherit',
                }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Category</label>
              <select
                value={editCategory}
                onChange={(e) => setEditCategory(e.target.value)}
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setEditing(false)}
                style={{ flex: 1, background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
              >
                Cancel
              </button>
              <button onClick={saveEdit} style={{ flex: 1 }}>
                Save
              </button>
            </div>
          </div>
        ) : (
          /* Display */
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span
                  style={{
                    background: CATEGORY_COLORS[feedback.category],
                    color: '#fff',
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '2px 10px',
                    borderRadius: 12,
                    textTransform: 'uppercase',
                  }}
                >
                  {feedback.category}
                </span>
              </div>
              <button
                onClick={startEdit}
                style={{
                  background: 'transparent',
                  color: 'var(--accent)',
                  fontSize: 13,
                  padding: '4px 8px',
                  minHeight: 32,
                  minWidth: 0,
                }}
              >
                Edit
              </button>
            </div>
            <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>{feedback.title}</h1>
            {feedback.description && (
              <p style={{ fontSize: 15, color: 'var(--text-primary)', lineHeight: 1.6, marginBottom: 12, whiteSpace: 'pre-wrap' }}>
                {feedback.description}
              </p>
            )}
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', gap: 16 }}>
              <span>{formatDate(feedback.created_at)}</span>
              {feedback.page_path && <span>from {feedback.page_path}</span>}
            </div>
          </>
        )}
      </div>

      {/* Status */}
      <div className="card" style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8, display: 'block' }}>
          Status
        </label>
        <div
          style={{
            display: 'flex',
            border: '1px solid var(--border)',
            borderRadius: 8,
            overflow: 'hidden',
          }}
          role="group"
          aria-label="Status"
        >
          {STATUSES.map((s, i) => {
            const isActive = feedback.status === s.value;
            return (
              <button
                key={s.value}
                onClick={() => handleStatusChange(s.value)}
                style={{
                  flex: 1,
                  background: isActive ? 'var(--accent)' : 'var(--bg-card)',
                  color: isActive ? '#fff' : 'var(--text-secondary)',
                  border: 'none',
                  borderLeft: i > 0 ? '1px solid var(--border)' : 'none',
                  borderRadius: 0,
                  fontWeight: isActive ? 600 : 400,
                  fontSize: 12,
                  minHeight: 40,
                  padding: '8px 0',
                  cursor: 'pointer',
                }}
                aria-pressed={isActive}
              >
                {s.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Comments */}
      <div className="card" style={{ marginBottom: 12 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>
          Comments ({feedback.comments.length})
        </h2>

        {feedback.comments.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 16 }}>
            No comments yet
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0, marginBottom: 16 }}>
            {feedback.comments.map((comment, i) => (
              <div
                key={comment.id}
                style={{
                  padding: '12px 0',
                  borderTop: i === 0 ? 'none' : '1px solid var(--border)',
                }}
              >
                {editingCommentId === comment.id ? (
                  /* Editing comment */
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <textarea
                      value={editCommentBody}
                      onChange={(e) => setEditCommentBody(e.target.value)}
                      rows={2}
                      autoFocus
                      style={{
                        background: 'var(--bg-secondary)',
                        color: 'var(--text-primary)',
                        border: '1px solid var(--border)',
                        padding: 10,
                        borderRadius: 'var(--radius)',
                        fontSize: 14,
                        width: '100%',
                        resize: 'vertical',
                        fontFamily: 'inherit',
                      }}
                    />
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={saveEditComment} style={{ fontSize: 13, padding: '6px 14px', minHeight: 32, minWidth: 0 }}>
                        Save
                      </button>
                      <button
                        onClick={() => setEditingCommentId(null)}
                        style={{ fontSize: 13, padding: '6px 14px', minHeight: 32, minWidth: 0, background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Displaying comment */
                  <>
                    <p style={{ fontSize: 14, lineHeight: 1.5, whiteSpace: 'pre-wrap', marginBottom: 6 }}>
                      {comment.body}
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12, color: 'var(--text-secondary)' }}>
                      <span>
                        {formatDate(comment.created_at)} {formatTime(comment.created_at)}
                      </span>
                      {comment.updated_at && <span>(edited)</span>}
                      <button
                        onClick={() => startEditComment(comment)}
                        style={{
                          background: 'transparent',
                          color: 'var(--accent)',
                          fontSize: 12,
                          padding: '2px 4px',
                          minHeight: 24,
                          minWidth: 0,
                          border: 'none',
                          cursor: 'pointer',
                        }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setConfirmDeleteCommentId(comment.id)}
                        style={{
                          background: 'transparent',
                          color: 'var(--danger)',
                          fontSize: 12,
                          padding: '2px 4px',
                          minHeight: 24,
                          minWidth: 0,
                          border: 'none',
                          cursor: 'pointer',
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Add comment */}
        <div style={{ display: 'flex', gap: 8 }}>
          <textarea
            value={commentBody}
            onChange={(e) => setCommentBody(e.target.value)}
            placeholder="Add a comment..."
            rows={2}
            style={{
              flex: 1,
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border)',
              padding: 10,
              borderRadius: 'var(--radius)',
              fontSize: 14,
              resize: 'vertical',
              fontFamily: 'inherit',
            }}
          />
          <button
            onClick={handleAddComment}
            disabled={submittingComment || !commentBody.trim()}
            style={{
              alignSelf: 'flex-end',
              minWidth: 52,
              minHeight: 44,
              fontSize: 18,
              padding: '8px 12px',
              background: submittingComment || !commentBody.trim() ? 'rgba(0,168,107,0.4)' : 'var(--accent)',
              cursor: submittingComment || !commentBody.trim() ? 'not-allowed' : 'pointer',
            }}
          >
            ↑
          </button>
        </div>
      </div>

      {/* Delete feedback */}
      <button
        onClick={() => setConfirmDelete(true)}
        style={{
          width: '100%',
          background: 'transparent',
          color: 'var(--danger)',
          border: '1px solid var(--danger)',
          fontSize: 15,
          padding: '14px 24px',
        }}
      >
        Delete Feedback
      </button>

      {/* Confirm dialogs */}
      {confirmDelete && (
        <ConfirmDialog
          message="Delete this feedback and all its comments?"
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
      {confirmDeleteCommentId !== null && (
        <ConfirmDialog
          message="Delete this comment?"
          onConfirm={() => handleDeleteComment(confirmDeleteCommentId)}
          onCancel={() => setConfirmDeleteCommentId(null)}
        />
      )}

      {/* Toast */}
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/api/client/src/pages/FeedbackDetail.tsx
git commit -m "feat(client): FeedbackDetail page with comments, status change, edit, delete"
```

---

### Task 8: Wire everything in App.tsx

**Files:**
- Modify: `packages/api/client/src/App.tsx`

- [ ] **Step 1: Add imports**

Add these imports at the top of `App.tsx`:

```ts
import { FeedbackList } from './pages/FeedbackList.js';
import { FeedbackDetail } from './pages/FeedbackDetail.js';
import { FeedbackButton } from './components/FeedbackButton.js';
```

- [ ] **Step 2: Add nav link for Feedback**

In the `Header` component's `<nav>` element, add a Feedback link after the Setup link:

```tsx
        <Link
          to="/feedback"
          style={{
            color: location.pathname.startsWith('/feedback') ? 'var(--accent)' : 'var(--text-secondary)',
            fontSize: 14,
          }}
        >
          Feedback
        </Link>
```

- [ ] **Step 3: Add routes**

Inside the `<Routes>` block, add these two routes after the `/setup` route:

```tsx
          <Route path="/feedback" element={<FeedbackList />} />
          <Route path="/feedback/:id" element={<FeedbackDetail />} />
```

- [ ] **Step 4: Add FeedbackButton to the layout**

In the `App` component, add `<FeedbackButton />` after the closing `</main>` tag and before the closing `</div>`:

```tsx
      <FeedbackButton />
```

- [ ] **Step 5: Run the full test suite**

Run: `cd packages/api && npx vitest run --reporter=verbose 2>&1 | tail -10`

Expected: All tests PASS (including all new feedback tests).

- [ ] **Step 6: Commit**

```bash
git add packages/api/client/src/App.tsx
git commit -m "feat(client): wire feedback routes, nav link, and floating button"
```

---

### Task 9: Verify end-to-end

**Files:** None (manual verification)

- [ ] **Step 1: Run the full test suite for both packages**

Run: `cd ~/Projects/plant-trmnl && npm test 2>&1 | tail -20`

Expected: All tests PASS across both packages.

- [ ] **Step 2: Start the dev server and test manually**

Run: `cd packages/api && npx tsx src/index.ts &`

Then in another terminal (or via curl):
```bash
# Create feedback
curl -s -X POST http://localhost:3900/api/feedback \
  -H 'Content-Type: application/json' \
  -d '{"title":"Test bug","category":"bug","pagePath":"/"}' | jq .

# List feedback
curl -s http://localhost:3900/api/feedback | jq .

# Add comment
curl -s -X POST http://localhost:3900/api/feedback/1/comments \
  -H 'Content-Type: application/json' \
  -d '{"body":"Looking into this"}' | jq .

# Get detail with comments
curl -s http://localhost:3900/api/feedback/1 | jq .
```

Expected: All endpoints return correct data.

- [ ] **Step 3: Kill dev server**

```bash
kill %1
```

- [ ] **Step 4: Final commit (if any fixes needed)**

Only commit if fixes were required during verification.
