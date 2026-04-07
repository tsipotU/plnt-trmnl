import Database from 'better-sqlite3';
import { initializeSchema } from './schema.js';

export function createDatabase(path: string): Database.Database {
  const db = new Database(path);
  initializeSchema(db);
  return db;
}
