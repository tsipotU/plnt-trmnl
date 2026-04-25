import { describe, it, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import Database from 'better-sqlite3';
import { initializeSchema } from '../database/schema.js';
import { createSystemRouter } from './system.js';

function makeApp() {
  const db = new Database(':memory:');
  initializeSchema(db);
  const app = express();
  app.use('/api/system', createSystemRouter(db));
  return { app, db };
}

describe('GET /api/system/ai-connection', () => {
  it('returns connected=false when no enrichment_complete events recorded', async () => {
    const { app } = makeApp();
    const res = await request(app).get('/api/system/ai-connection');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ connected: false });
  });

  it('returns connected=true when an enrichment_complete event exists in the last 7 days', async () => {
    const { app, db } = makeApp();
    db.prepare(
      `INSERT INTO event_log (event_type, created_at) VALUES (?, datetime('now', '-2 days'))`,
    ).run('enrichment_complete');
    const res = await request(app).get('/api/system/ai-connection');
    expect(res.body).toEqual({ connected: true });
  });

  it('returns connected=false when the event is older than 7 days', async () => {
    const { app, db } = makeApp();
    db.prepare(
      `INSERT INTO event_log (event_type, created_at) VALUES (?, datetime('now', '-10 days'))`,
    ).run('enrichment_complete');
    const res = await request(app).get('/api/system/ai-connection');
    expect(res.body).toEqual({ connected: false });
  });

  it('ignores other event types', async () => {
    const { app, db } = makeApp();
    db.prepare(
      `INSERT INTO event_log (event_type, created_at) VALUES (?, datetime('now'))`,
    ).run('watered');
    const res = await request(app).get('/api/system/ai-connection');
    expect(res.body).toEqual({ connected: false });
  });
});
