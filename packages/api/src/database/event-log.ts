import type Database from 'better-sqlite3';
import type { ScheduleResult } from '../scheduling/bin-packer.js';

export interface LogEventInput {
  plantId: number | null;
  eventType: string;
  oldValue?: string;
  newValue?: string;
  reason: string;
  batchId?: string;
}

export function logEvent(db: Database.Database, input: LogEventInput): void {
  db.prepare(
    `INSERT INTO event_log (plant_id, event_type, old_value, new_value, reason, batch_id)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(
    input.plantId,
    input.eventType,
    input.oldValue ?? null,
    input.newValue ?? null,
    input.reason,
    input.batchId ?? null,
  );
}

export function getEventsForPlant(db: Database.Database, plantId: number, limit = 50): any[] {
  return db.prepare(
    'SELECT * FROM event_log WHERE plant_id = ? ORDER BY created_at DESC, id DESC LIMIT ?'
  ).all(plantId, limit);
}

/**
 * Emit overflow_rebalance or schedule_congested events based on ScheduleResult.
 * No-op if the schedule landed on its ideal date with capacity to spare.
 */
export function logScheduleEvents(
  db: Database.Database,
  plantId: number,
  result: ScheduleResult,
): void {
  if (result.overflowShifted) {
    const deltaMs = new Date(result.date).getTime() - new Date(result.originalIdeal).getTime();
    const deltaDays = Math.round(deltaMs / (1000 * 60 * 60 * 24));
    logEvent(db, {
      plantId,
      eventType: 'overflow_rebalance',
      oldValue: JSON.stringify({ ideal: result.originalIdeal }),
      newValue: JSON.stringify({ chosen: result.date, delta_days: deltaDays }),
      reason: `Schedule overflow: shifted ${deltaDays} day(s)`,
    });
  } else if (result.congested) {
    logEvent(db, {
      plantId,
      eventType: 'schedule_congested',
      oldValue: JSON.stringify({ ideal: result.originalIdeal }),
      reason: 'Schedule congested: ±3-day window full, kept ideal date',
    });
  }
}
