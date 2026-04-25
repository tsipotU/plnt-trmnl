import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import Database from 'better-sqlite3';
import express from 'express';
import { initializeSchema } from '../database/schema.js';
import { createScheduleRouter } from './schedule.js';

describe('GET /api/schedule/week', () => {
  let app: express.Express;
  let db: Database.Database;

  beforeEach(() => {
    db = new Database(':memory:');
    initializeSchema(db);
    app = express();
    app.use(express.json());
    app.use('/api/schedule', createScheduleRouter(db));
  });

  it('returns 7 days starting from `from` param', async () => {
    const res = await request(app).get('/api/schedule/week?from=2026-04-22').expect(200);
    expect(res.body.days).toHaveLength(7);
    expect(res.body.days[0].date).toBe('2026-04-22');
    expect(res.body.days[6].date).toBe('2026-04-28');
    expect(res.body.days[0].is_today).toBeDefined();
  });

  it('buckets plants by next_water_date', async () => {
    db.prepare(
      `INSERT INTO plants (name, base_interval, current_interval, next_water_date, location)
       VALUES ('Monstera', 7, 7, '2026-04-24', 'Living')`
    ).run();

    const res = await request(app).get('/api/schedule/week?from=2026-04-22').expect(200);
    const day = res.body.days.find((d: any) => d.date === '2026-04-24');
    expect(day.count).toBe(1);
    expect(day.plant_names).toContain('Monstera');
  });

  it('rolls overdue plants into today', async () => {
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400_000).toISOString().slice(0, 10);
    db.prepare(
      `INSERT INTO plants (name, base_interval, current_interval, next_water_date, location)
       VALUES ('Overdue', 7, 7, ?, 'Living')`
    ).run(yesterday);

    const res = await request(app).get(`/api/schedule/week?from=${today}`).expect(200);
    const today_row = res.body.days[0];
    expect(today_row.overdue_ids).toHaveLength(1);
    expect(today_row.count).toBeGreaterThan(0);
  });

  it('excludes archived plants', async () => {
    db.prepare(
      `INSERT INTO plants (name, base_interval, current_interval, next_water_date, archived, location)
       VALUES ('Zombie', 7, 7, '2026-04-24', 1, 'Living')`
    ).run();

    const res = await request(app).get('/api/schedule/week?from=2026-04-22').expect(200);
    const day = res.body.days.find((d: any) => d.date === '2026-04-24');
    expect(day.count).toBe(0);
  });

  it('returns 400 on invalid from param', async () => {
    await request(app).get('/api/schedule/week?from=banana').expect(400);
    await request(app).get('/api/schedule/week?from=2026-13-45').expect(400);
  });

  it('returns 11 days when ?days=11 is passed', async () => {
    const res = await request(app).get('/api/schedule/week?from=2026-04-22&days=11').expect(200);
    expect(res.body.days).toHaveLength(11);
    expect(res.body.days[0].date).toBe('2026-04-22');
    expect(res.body.days[10].date).toBe('2026-05-02');
  });

  it('defaults to 7 days when no ?days param', async () => {
    const res = await request(app).get('/api/schedule/week?from=2026-04-22').expect(200);
    expect(res.body.days).toHaveLength(7);
  });

  it('rejects non-integer ?days param', async () => {
    await request(app).get('/api/schedule/week?from=2026-04-22&days=banana').expect(400);
  });

  it('rejects ?days outside [1, 30]', async () => {
    await request(app).get('/api/schedule/week?from=2026-04-22&days=0').expect(400);
    await request(app).get('/api/schedule/week?from=2026-04-22&days=31').expect(400);
  });

  it('still rolls overdue plants into today (the today index can be > 0 now)', async () => {
    const today = new Date().toISOString().slice(0, 10);
    const fiveDaysAgo = new Date(Date.now() - 5 * 86400_000).toISOString().slice(0, 10);
    const sixDaysAgo = new Date(Date.now() - 6 * 86400_000).toISOString().slice(0, 10);

    db.prepare(
      `INSERT INTO plants (name, base_interval, current_interval, next_water_date, location)
       VALUES ('Overdue', 7, 7, ?, 'Living')`
    ).run(sixDaysAgo);

    const res = await request(app).get(`/api/schedule/week?from=${fiveDaysAgo}&days=11`).expect(200);
    const todayCell = res.body.days.find((d: any) => d.date === today);
    expect(todayCell).toBeDefined();
    expect(todayCell.overdue_ids).toHaveLength(1);
  });

  it('does not double-count overdue plants when from < today', async () => {
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400_000).toISOString().slice(0, 10);

    db.prepare(
      `INSERT INTO plants (name, base_interval, current_interval, next_water_date, location)
       VALUES ('OverdueInWindow', 7, 7, ?, 'Living')`
    ).run(yesterday);

    const res = await request(app).get(`/api/schedule/week?from=${yesterday}`).expect(200);

    // Yesterday's cell should include the plant in its natural bucket:
    const yesterdayCell = res.body.days.find((d: any) => d.date === yesterday);
    expect(yesterdayCell.plant_ids).toContain(1);

    // Today's cell should NOT include this plant in overdue_ids (it's already visible):
    const todayCell = res.body.days.find((d: any) => d.date === today);
    expect(todayCell.overdue_ids).not.toContain(1);
  });
});
