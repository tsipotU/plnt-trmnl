import type Database from 'better-sqlite3';
import fs from 'fs';

export function seedOrnaments(db: Database.Database, ornamentsDir: string): void {
  const existing = db.prepare('SELECT COUNT(*) as c FROM decorative_ornaments').get() as { c: number };
  if (existing.c > 0) return; // already seeded

  const files = fs.readdirSync(ornamentsDir)
    .filter(f => f.startsWith('ornament-') && (f.endsWith('.svg') || f.endsWith('.png')))
    .sort();

  const insert = db.prepare('INSERT INTO decorative_ornaments (image_path) VALUES (?)');
  const tx = db.transaction(() => {
    for (const file of files) {
      insert.run(`/assets/ornaments/${file}`);
    }
  });
  tx();
}
