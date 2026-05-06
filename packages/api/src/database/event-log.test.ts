import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { initializeSchema } from './schema.js';
import { logEvent, getEventsForPlant } from './event-log.js';

describe('event-log', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = new Database(':memory:');
    initializeSchema(db);
    // Insert a plant so FK constraint is satisfied for plantId: 1
    db.prepare(`INSERT INTO plants (id, name, base_interval, current_interval) VALUES (1, 'Test Plant', 7, 7)`).run();
  });

  afterEach(() => {
    db.close();
  });

  it('logs an event and retrieves it', () => {
    logEvent(db, { plantId: 1, eventType: 'watered', reason: 'Manual watering' });
    const events = getEventsForPlant(db, 1);
    expect(events).toHaveLength(1);
    expect(events[0].event_type).toBe('watered');
    expect(events[0].reason).toBe('Manual watering');
  });

  it('logs events with old and new values', () => {
    logEvent(db, {
      plantId: 1,
      eventType: 'schedule_change',
      oldValue: '7',
      newValue: '9',
      reason: 'Calibration: soil was wet (4/5)',
    });
    const events = getEventsForPlant(db, 1);
    expect(events[0].old_value).toBe('7');
    expect(events[0].new_value).toBe('9');
  });

  it('returns events in reverse chronological order', () => {
    logEvent(db, { plantId: 1, eventType: 'watered', reason: 'First' });
    logEvent(db, { plantId: 1, eventType: 'calibration', reason: 'Second' });
    const events = getEventsForPlant(db, 1);
    expect(events[0].reason).toBe('Second');
    expect(events[1].reason).toBe('First');
  });

  it('respects limit parameter', () => {
    for (let i = 0; i < 10; i++) {
      logEvent(db, { plantId: 1, eventType: 'watered', reason: `Event ${i}` });
    }
    const events = getEventsForPlant(db, 1, 5);
    expect(events).toHaveLength(5);
  });

  it('logs events with null plant_id', () => {
    logEvent(db, { plantId: null, eventType: 'system_note', reason: 'Some system-level event' });
    // Should not throw
  });
});
