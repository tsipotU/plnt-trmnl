import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { initializeSchema } from '../database/schema.js';
import { processRetryQueue } from './retry.js';

function seedPlant(db: Database.Database, name = 'Monstera') {
  const result = db.prepare(
    `INSERT INTO plants (name, pot_size_cm, plant_size, location, light_level,
       base_interval, current_interval, last_watered_at, next_water_date, enrichment_status)
     VALUES (?, 25, 'large', 'living room', 'bright_indirect', 7, 7, '2026-04-01', '2026-04-08', 'pending')`
  ).run(name);
  return Number(result.lastInsertRowid);
}

function seedQueue(
  db: Database.Database,
  plantId: number,
  overrides: Record<string, unknown> = {}
) {
  const result = db.prepare(
    `INSERT INTO enrichment_queue (plant_id, status, attempts)
     VALUES (?, ?, ?)`
  ).run(
    plantId,
    overrides.status ?? 'pending',
    overrides.attempts ?? 0
  );
  return Number(result.lastInsertRowid);
}

describe('processRetryQueue', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = new Database(':memory:');
    initializeSchema(db);
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    db.close();
    vi.unstubAllGlobals();
  });

  it('processes pending entries and returns stats', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200 }));
    const plantId = seedPlant(db);
    seedQueue(db, plantId);

    const result = await processRetryQueue(db, 'https://n8n.example.com/webhook', 'http://api/callback', 3);

    expect(result.processed).toBe(1);
    expect(result.succeeded).toBe(1);
    expect(result.failed).toBe(0);
  });

  it('updates status to in_progress and increments attempts on success', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200 }));
    const plantId = seedPlant(db);
    const queueId = seedQueue(db, plantId);

    await processRetryQueue(db, 'https://n8n.example.com/webhook', 'http://api/callback', 3);

    const entry = db.prepare('SELECT * FROM enrichment_queue WHERE id = ?').get(queueId) as any;
    expect(entry.status).toBe('in_progress');
    expect(entry.attempts).toBe(1);
    expect(entry.last_attempt_at).toBeDefined();
  });

  it('increments attempts on failure but does not mark failed unless at max', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }));
    const plantId = seedPlant(db);
    const queueId = seedQueue(db, plantId, { attempts: 1 });

    await processRetryQueue(db, 'https://n8n.example.com/webhook', 'http://api/callback', 3);

    const entry = db.prepare('SELECT * FROM enrichment_queue WHERE id = ?').get(queueId) as any;
    expect(entry.attempts).toBe(2);
    expect(entry.status).toBe('pending'); // not yet at max
  });

  it('marks as failed after reaching max retries', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }));
    const plantId = seedPlant(db);
    const queueId = seedQueue(db, plantId, { attempts: 2 }); // one away from max=3

    await processRetryQueue(db, 'https://n8n.example.com/webhook', 'http://api/callback', 3);

    const entry = db.prepare('SELECT * FROM enrichment_queue WHERE id = ?').get(queueId) as any;
    expect(entry.status).toBe('failed');
    expect(entry.attempts).toBe(3);
  });

  it('marks as failed after reaching max retries on network error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));
    const plantId = seedPlant(db);
    const queueId = seedQueue(db, plantId, { attempts: 2 });

    await processRetryQueue(db, 'https://n8n.example.com/webhook', 'http://api/callback', 3);

    const entry = db.prepare('SELECT * FROM enrichment_queue WHERE id = ?').get(queueId) as any;
    expect(entry.status).toBe('failed');
  });

  it('logs a failed event when max retries reached', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }));
    const plantId = seedPlant(db);
    seedQueue(db, plantId, { attempts: 2 });

    await processRetryQueue(db, 'https://n8n.example.com/webhook', 'http://api/callback', 3);

    const events = db.prepare(
      `SELECT * FROM event_log WHERE plant_id = ? AND event_type = 'enrichment_failed'`
    ).all(plantId) as any[];

    expect(events).toHaveLength(1);
  });

  it('skips entries with status = in_progress', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200 }));
    const plantId = seedPlant(db);
    seedQueue(db, plantId, { status: 'in_progress' });

    const result = await processRetryQueue(db, 'https://n8n.example.com/webhook', 'http://api/callback', 3);

    expect(result.processed).toBe(0);
  });

  it('skips entries with status = complete', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200 }));
    const plantId = seedPlant(db);
    seedQueue(db, plantId, { status: 'complete' });

    const result = await processRetryQueue(db, 'https://n8n.example.com/webhook', 'http://api/callback', 3);

    expect(result.processed).toBe(0);
  });

  it('skips entries already at max attempts', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200 }));
    const plantId = seedPlant(db);
    seedQueue(db, plantId, { attempts: 3 }); // already at maxRetries=3

    const result = await processRetryQueue(db, 'https://n8n.example.com/webhook', 'http://api/callback', 3);

    expect(result.processed).toBe(0);
  });

  it('processes multiple entries and returns correct stats', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 200 })
      .mockResolvedValueOnce({ ok: false, status: 500 })
    );
    const p1 = seedPlant(db, 'Plant1');
    const p2 = seedPlant(db, 'Plant2');
    seedQueue(db, p1);
    seedQueue(db, p2);

    const result = await processRetryQueue(db, 'https://n8n.example.com/webhook', 'http://api/callback', 3);

    expect(result.processed).toBe(2);
    expect(result.succeeded).toBe(1);
    expect(result.failed).toBe(0); // not at max yet, so not counted as finally failed
  });

  it('counts permanently failed in failed stat', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }));
    const plantId = seedPlant(db);
    seedQueue(db, plantId, { attempts: 2 }); // max=3, this will hit max

    const result = await processRetryQueue(db, 'https://n8n.example.com/webhook', 'http://api/callback', 3);

    expect(result.failed).toBe(1);
  });

  it('returns zero stats when queue is empty', async () => {
    const result = await processRetryQueue(db, 'https://n8n.example.com/webhook', 'http://api/callback', 3);

    expect(result.processed).toBe(0);
    expect(result.succeeded).toBe(0);
    expect(result.failed).toBe(0);
  });
});
