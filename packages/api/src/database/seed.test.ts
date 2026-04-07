import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { initializeSchema } from './schema.js';
import { seedFacts } from './seed.js';

describe('seedFacts', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = new Database(':memory:');
    initializeSchema(db);
  });

  afterEach(() => {
    db.close();
  });

  it('inserts all facts from the provided array', () => {
    const sampleFacts = ['Fact one.', 'Fact two.', 'Fact three.'];
    seedFacts(db, sampleFacts);
    const count = db.prepare('SELECT COUNT(*) as c FROM facts').get() as { c: number };
    expect(count.c).toBe(3);
  });

  it('marks all seed facts with source "seed" and null plant_id', () => {
    seedFacts(db, ['A fact.']);
    const fact = db.prepare('SELECT * FROM facts WHERE id = 1').get() as any;
    expect(fact.source).toBe('seed');
    expect(fact.plant_id).toBeNull();
  });

  it('is idempotent — does not duplicate on second run', () => {
    const facts = ['Fact one.'];
    seedFacts(db, facts);
    seedFacts(db, facts);
    const count = db.prepare('SELECT COUNT(*) as c FROM facts').get() as { c: number };
    expect(count.c).toBe(1);
  });
});
