import type Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

export async function performBackup(db: Database.Database, backupDir: string): Promise<string> {
  // Create backup dir if it doesn't exist
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const backupPath = path.join(backupDir, `plant-trmnl-${date}.db`);

  // Use better-sqlite3's backup API
  await db.backup(backupPath);

  // Cleanup: keep only last 7 backups
  cleanupOldBackups(backupDir, 7);

  return backupPath;
}

export function cleanupOldBackups(backupDir: string, keep: number): void {
  const files = fs
    .readdirSync(backupDir)
    .filter((f) => f.startsWith('plant-trmnl-') && f.endsWith('.db'))
    .sort()
    .reverse(); // newest first

  for (const file of files.slice(keep)) {
    fs.unlinkSync(path.join(backupDir, file));
  }
}
