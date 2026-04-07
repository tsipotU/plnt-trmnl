import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { initializeSchema } from './schema.js';
import { performBackup, cleanupOldBackups } from './backup.js';

describe('backup', () => {
  let db: Database.Database;
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'plant-trmnl-backup-'));
    const dbPath = path.join(tmpDir, 'test.db');
    db = new Database(dbPath);
    initializeSchema(db);
  });

  afterEach(() => {
    db.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('creates a backup file', async () => {
    const backupDir = path.join(tmpDir, 'backups');
    const backupPath = await performBackup(db, backupDir);
    expect(fs.existsSync(backupPath)).toBe(true);
  });

  it('backup file is a valid SQLite database', async () => {
    const backupDir = path.join(tmpDir, 'backups');
    const backupPath = await performBackup(db, backupDir);
    const backupDb = new Database(backupPath);
    const tables = backupDb.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    backupDb.close();
    expect(tables.length).toBeGreaterThan(0);
  });

  it('cleanupOldBackups keeps only N newest', () => {
    const backupDir = path.join(tmpDir, 'backups');
    fs.mkdirSync(backupDir, { recursive: true });
    // Create 10 fake backup files
    for (let i = 1; i <= 10; i++) {
      const day = String(i).padStart(2, '0');
      fs.writeFileSync(path.join(backupDir, `plant-trmnl-2026-04-${day}.db`), 'fake');
    }
    cleanupOldBackups(backupDir, 7);
    const remaining = fs.readdirSync(backupDir);
    expect(remaining).toHaveLength(7);
    // Should keep the 7 newest (04-10 through 04-04)
    expect(remaining).toContain('plant-trmnl-2026-04-10.db');
    expect(remaining).not.toContain('plant-trmnl-2026-04-01.db');
  });
});
