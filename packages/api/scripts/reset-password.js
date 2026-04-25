#!/usr/bin/env node
/**
 * Auth recovery script (#136). Clears the admin password hash, the setup
 * token, and ALL active sessions. The next API start will generate a fresh
 * setup token in its logs.
 *
 * Usage (in the running container):
 *   docker compose exec plant-api node scripts/reset-password.js
 *
 * Local (dev):
 *   DATABASE_PATH=./plant-trmnl.db node packages/api/scripts/reset-password.js
 */
const Database = require('better-sqlite3');
const path = require('node:path');

const dbPath = process.env.DATABASE_PATH ?? path.resolve('/data/plant-trmnl.db');
console.log(`[reset-password] using db: ${dbPath}`);

const db = new Database(dbPath);
try {
  const passwordCleared = db
    .prepare(`DELETE FROM app_state WHERE key = 'admin_password_hash'`)
    .run();
  const tokenCleared = db
    .prepare(`DELETE FROM app_state WHERE key = 'setup_token'`)
    .run();
  const sessionsCleared = db.prepare(`DELETE FROM sessions`).run();

  console.log(
    `[reset-password] removed ${passwordCleared.changes} password row(s), ` +
      `${tokenCleared.changes} setup-token row(s), ` +
      `${sessionsCleared.changes} session row(s).`,
  );
  console.log('[reset-password] restart the API to generate a new setup token.');
} finally {
  db.close();
}
