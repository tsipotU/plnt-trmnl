import type Database from 'better-sqlite3';
import { findBestDate, type ScheduledPlant } from './bin-packer.js';
import { calculateNextWaterDate } from './engine.js';
import { logEvent } from '../database/event-log.js';

/**
 * Check if vacation mode is currently active.
 * Returns true if today <= vacation_until date.
 */
export function isVacationActive(db: Database.Database, today?: string): boolean {
  const currentDate = today ?? new Date().toISOString().split('T')[0];
  const row = db.prepare(
    `SELECT value FROM app_state WHERE key = 'vacation_until'`
  ).get() as { value: string } | undefined;

  if (!row) return false;
  return currentDate <= row.value;
}

/**
 * Start vacation mode by storing the until date in app_state.
 * Logs a vacation_start event.
 */
export function startVacation(db: Database.Database, until: string): void {
  db.prepare(
    `INSERT OR REPLACE INTO app_state (key, value, updated_at) VALUES ('vacation_until', ?, datetime('now'))`
  ).run(until);

  logEvent(db, {
    plantId: null,
    eventType: 'vacation_start',
    newValue: until,
    reason: `Vacation started until ${until}`,
  });
}

/**
 * End vacation early. Recalculates all active plants' next_water_date from today
 * using their current_interval. Runs bin-packer to spread them.
 * Logs a vacation_end event.
 */
export function endVacation(db: Database.Database, today?: string): void {
  const currentDate = today ?? new Date().toISOString().split('T')[0];

  // Remove vacation from app_state
  db.prepare(`DELETE FROM app_state WHERE key = 'vacation_until'`).run();

  // Get all active plants
  const plants = db.prepare(
    `SELECT id, location, current_interval FROM plants WHERE archived = 0`
  ).all() as Array<{ id: number; location: string; current_interval: number }>;

  // Set last_watered_at to today for all active plants, then bin-pack next_water_date
  const scheduled: ScheduledPlant[] = [];

  for (const plant of plants) {
    const idealDate = calculateNextWaterDate(currentDate, plant.current_interval);
    const bestDate = findBestDate(idealDate, plant.location ?? '', scheduled);

    // Update this plant
    db.prepare(
      `UPDATE plants SET
         last_watered_at = ?,
         next_water_date = ?,
         updated_at      = datetime('now')
       WHERE id = ?`
    ).run(currentDate, bestDate, plant.id);

    // Add to scheduled list so subsequent plants see already-assigned dates
    scheduled.push({
      id: plant.id,
      location: plant.location ?? '',
      nextWaterDate: bestDate,
    });
  }

  logEvent(db, {
    plantId: null,
    eventType: 'vacation_end',
    reason: `Vacation ended — rescheduled ${plants.length} plants from ${currentDate}`,
  });
}

/**
 * Get the current vacation status.
 */
export function getVacationStatus(
  db: Database.Database,
  today?: string
): { active: boolean; until: string | null } {
  const row = db.prepare(
    `SELECT value FROM app_state WHERE key = 'vacation_until'`
  ).get() as { value: string } | undefined;

  if (!row) {
    return { active: false, until: null };
  }

  return {
    active: isVacationActive(db, today),
    until: row.value,
  };
}
