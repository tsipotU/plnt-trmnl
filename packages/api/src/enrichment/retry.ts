import type Database from 'better-sqlite3';
import pino from 'pino';
import { fireEnrichmentWebhook } from './webhook.js';
import { logEvent } from '../database/event-log.js';

const logger = pino({ name: 'enrichment.retry' });

interface QueueRow {
  id: number;
  plant_id: number;
  status: string;
  attempts: number;
}

interface PlantRow {
  id: number;
  name: string;
  pot_size_cm: number | null;
  plant_size: string | null;
  location: string | null;
  light_level: string | null;
}

export async function processRetryQueue(
  db: Database.Database,
  webhookUrl: string,
  callbackUrl: string,
  maxRetries: number
): Promise<{ processed: number; succeeded: number; failed: number }> {
  const pending = db.prepare(
    `SELECT eq.* FROM enrichment_queue eq
     WHERE eq.status = 'pending'
       AND eq.attempts < ?`
  ).all(maxRetries) as QueueRow[];

  let processed = 0;
  let succeeded = 0;
  let failed = 0;

  for (const entry of pending) {
    const plant = db.prepare('SELECT * FROM plants WHERE id = ?').get(entry.plant_id) as PlantRow | undefined;

    if (!plant) {
      logger.warn({ queueId: entry.id, plantId: entry.plant_id }, 'plant not found for queue entry, skipping');
      continue;
    }

    processed++;

    const ok = await fireEnrichmentWebhook(
      webhookUrl,
      plant.id,
      {
        name: plant.name,
        potSizeCm: plant.pot_size_cm ?? 0,
        plantSize: plant.plant_size ?? '',
        location: plant.location ?? '',
        lightLevel: plant.light_level ?? '',
      },
      callbackUrl
    );

    const newAttempts = entry.attempts + 1;
    const now = new Date().toISOString();

    if (ok) {
      db.prepare(
        `UPDATE enrichment_queue SET status = 'in_progress', attempts = ?, last_attempt_at = ? WHERE id = ?`
      ).run(newAttempts, now, entry.id);
      succeeded++;
      logger.info({ plantId: plant.id, attempts: newAttempts }, 'enrichment webhook sent, status in_progress');
    } else {
      if (newAttempts >= maxRetries) {
        db.prepare(
          `UPDATE enrichment_queue SET status = 'failed', attempts = ?, last_attempt_at = ? WHERE id = ?`
        ).run(newAttempts, now, entry.id);
        failed++;

        logEvent(db, {
          plantId: plant.id,
          eventType: 'enrichment_failed',
          newValue: String(newAttempts),
          reason: `Enrichment webhook failed after ${newAttempts} attempts`,
        });

        logger.error({ plantId: plant.id, attempts: newAttempts }, 'enrichment failed permanently');
      } else {
        db.prepare(
          `UPDATE enrichment_queue SET attempts = ?, last_attempt_at = ? WHERE id = ?`
        ).run(newAttempts, now, entry.id);
        logger.warn({ plantId: plant.id, attempts: newAttempts, maxRetries }, 'enrichment webhook failed, will retry');
      }
    }
  }

  return { processed, succeeded, failed };
}
