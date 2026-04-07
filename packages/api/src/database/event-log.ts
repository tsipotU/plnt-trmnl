import type Database from 'better-sqlite3';

export interface LogEventInput {
  plantId: number | null;
  eventType: string;
  oldValue?: string;
  newValue?: string;
  reason: string;
}

export function logEvent(db: Database.Database, input: LogEventInput): void {
  db.prepare(
    `INSERT INTO event_log (plant_id, event_type, old_value, new_value, reason)
     VALUES (?, ?, ?, ?, ?)`
  ).run(input.plantId, input.eventType, input.oldValue ?? null, input.newValue ?? null, input.reason);
}

export function getEventsForPlant(db: Database.Database, plantId: number, limit = 50): any[] {
  return db.prepare(
    'SELECT * FROM event_log WHERE plant_id = ? ORDER BY created_at DESC, id DESC LIMIT ?'
  ).all(plantId, limit);
}
