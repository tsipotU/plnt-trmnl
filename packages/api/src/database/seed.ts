import type Database from 'better-sqlite3';

export function seedFacts(db: Database.Database, facts: string[]): void {
  const insert = db.prepare(
    'INSERT INTO facts (text, source, plant_id) VALUES (?, ?, NULL)'
  );
  const existing = db.prepare('SELECT text FROM facts WHERE source = ?')
    .all('seed') as { text: string }[];
  const existingTexts = new Set(existing.map(f => f.text));

  const tx = db.transaction(() => {
    for (const fact of facts) {
      if (!existingTexts.has(fact)) {
        insert.run(fact, 'seed');
      }
    }
  });
  tx();
}
