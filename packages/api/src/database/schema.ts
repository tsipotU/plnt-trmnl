import Database from 'better-sqlite3';

export function initializeSchema(db: Database.Database): void {
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.prepare(`
    CREATE TABLE IF NOT EXISTS plants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      common_name TEXT,
      species TEXT,
      pot_size_cm INTEGER,
      pot_size_category TEXT CHECK(pot_size_category IN ('Extra Small', 'Small', 'Medium', 'Large', 'Extra Large', 'Other')),
      plant_size TEXT CHECK(plant_size IN ('small', 'medium', 'large')),
      identifier TEXT,
      location TEXT,
      light_level TEXT CHECK(light_level IN ('low', 'medium', 'bright_indirect', 'direct')),
      base_interval INTEGER,
      current_interval INTEGER,
      water_ratio REAL,
      water_description TEXT,
      last_watered_at TEXT,
      next_water_date TEXT,
      fertilizer_interval_weeks INTEGER,
      last_fertilized_at TEXT,
      heating_season_modifier REAL DEFAULT 1.0,
      illustration_path TEXT,
      calibration_cycle INTEGER DEFAULT 0,
      is_converged INTEGER DEFAULT 0,
      skip_next_calibration INTEGER DEFAULT 0,
      enrichment_status TEXT DEFAULT 'pending' CHECK(enrichment_status IN ('pending', 'complete', 'failed')),
      archived INTEGER DEFAULT 0,
      archived_at TEXT,
      archive_reason TEXT CHECK(archive_reason IN ('died', 'gave_away', 'moved', 'other')),
      archive_note TEXT,
      origin_type TEXT CHECK(origin_type IN ('purchased', 'received', 'seedling', 'unknown')),
      origin_source TEXT,
      mother_plant_id INTEGER REFERENCES plants(id),
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `).run();

  db.prepare(`
    CREATE TABLE IF NOT EXISTS calibration_questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      plant_id INTEGER NOT NULL REFERENCES plants(id),
      question_text TEXT,
      question_type TEXT,
      scale_min_label TEXT,
      scale_max_label TEXT,
      display_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `).run();

  db.prepare(`
    CREATE TABLE IF NOT EXISTS calibrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      plant_id INTEGER NOT NULL REFERENCES plants(id),
      question_id INTEGER NOT NULL REFERENCES calibration_questions(id),
      answer_value INTEGER CHECK(answer_value BETWEEN 1 AND 5),
      interval_before INTEGER,
      interval_after INTEGER,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `).run();

  db.prepare(`
    CREATE TABLE IF NOT EXISTS plant_conditions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      plant_id INTEGER NOT NULL REFERENCES plants(id),
      condition_name TEXT,
      symptoms TEXT,
      remedy TEXT,
      severity TEXT CHECK(severity IN ('info', 'warning', 'critical')),
      is_active INTEGER DEFAULT 1,
      detected_via TEXT CHECK(detected_via IN ('calibration', 'manual')),
      resolved_at TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `).run();

  db.prepare(`
    CREATE TABLE IF NOT EXISTS facts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      plant_id INTEGER REFERENCES plants(id),
      species TEXT,
      text TEXT,
      source TEXT CHECK(source IN ('seed', 'enrichment', 'catalog')),
      shown_count INTEGER DEFAULT 0,
      shown_at TEXT,
      is_disabled INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `).run();

  db.prepare(`
    CREATE TABLE IF NOT EXISTS decorative_ornaments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      image_path TEXT,
      shown_count INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `).run();

  db.prepare(`
    CREATE TABLE IF NOT EXISTS event_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      plant_id INTEGER REFERENCES plants(id),
      event_type TEXT,
      old_value TEXT,
      new_value TEXT,
      reason TEXT,
      batch_id TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `).run();

  db.prepare(`
    CREATE TABLE IF NOT EXISTS enrichment_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      plant_id INTEGER NOT NULL REFERENCES plants(id),
      status TEXT CHECK(status IN ('pending', 'in_progress', 'complete', 'failed')),
      attempts INTEGER DEFAULT 0,
      last_attempt_at TEXT,
      error_message TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `).run();

  db.prepare(`
    CREATE TABLE IF NOT EXISTS app_state (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `).run();

  db.prepare(`
    CREATE TABLE IF NOT EXISTS feedback (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      category TEXT NOT NULL CHECK(category IN ('bug', 'feature', 'improvement', 'other')),
      page_path TEXT,
      status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open', 'in_progress', 'done', 'wont_fix')),
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT
    )
  `).run();

  db.prepare(`
    CREATE TABLE IF NOT EXISTS feedback_comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      feedback_id INTEGER NOT NULL REFERENCES feedback(id) ON DELETE CASCADE,
      body TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT
    )
  `).run();

  db.prepare(`
    CREATE TABLE IF NOT EXISTS feedback_images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      feedback_id INTEGER NOT NULL REFERENCES feedback(id) ON DELETE CASCADE,
      filename TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `).run();

  db.prepare(`
    CREATE TABLE IF NOT EXISTS plant_notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      plant_id INTEGER NOT NULL REFERENCES plants(id) ON DELETE CASCADE,
      body TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT
    )
  `).run();

  // Idempotent column additions for live databases created before the column existed.
  // CREATE TABLE IF NOT EXISTS above leaves existing tables untouched.
  addColumnIfMissing(db, 'plants', 'identifier', 'TEXT');
  addColumnIfMissing(db, 'plants', 'archive_reason', 'TEXT');
  addColumnIfMissing(db, 'plants', 'archive_note', 'TEXT');
  addColumnIfMissing(db, 'plants', 'pot_size_category', 'TEXT');
  addColumnIfMissing(db, 'plants', 'origin_type', 'TEXT');
  addColumnIfMissing(db, 'plants', 'origin_source', 'TEXT');
  addColumnIfMissing(db, 'plants', 'mother_plant_id', 'INTEGER');
  addColumnIfMissing(db, 'event_log', 'batch_id', 'TEXT');
  addColumnIfMissing(db, 'plants', 'skip_next_calibration', 'INTEGER DEFAULT 0');

  // One-way migration: legacy `plants.notes` column superseded by the
  // `plant_notes` table (#32). Safe to drop on live DBs created before v0.14.
  dropColumnIfExists(db, 'plants', 'notes');

  // Issue #4: catalog-sourced facts. Add `species` column and relax the
  // `source` CHECK to accept 'catalog'. On live DBs created before #4 the
  // CHECK must be rebuilt (SQLite can't ALTER a CHECK in place).
  addColumnIfMissing(db, 'facts', 'species', 'TEXT');
  relaxFactsSourceCheckIfNeeded(db);

  // Issue #38: shown_at tracking for daily fact rotation. Nullable timestamp,
  // set when a fact is picked for the day. NULL = never shown this cycle.
  addColumnIfMissing(db, 'facts', 'shown_at', 'TEXT');
}

function addColumnIfMissing(
  db: Database.Database,
  table: string,
  column: string,
  definition: string,
): void {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  if (cols.some((c) => c.name === column)) return;
  db.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`).run();
}

function dropColumnIfExists(
  db: Database.Database,
  table: string,
  column: string,
): void {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  if (!cols.some((c) => c.name === column)) return;
  db.prepare(`ALTER TABLE ${table} DROP COLUMN ${column}`).run();
}

/**
 * Issue #4: the original `facts` table was created with
 *   source TEXT CHECK(source IN ('seed', 'enrichment'))
 * To allow `source='catalog'` on live databases we need to rebuild the
 * table — SQLite does not support altering a CHECK constraint in place.
 * This migration is idempotent: it inspects the stored CREATE statement in
 * sqlite_master and only rebuilds when the old constraint is present.
 */
function relaxFactsSourceCheckIfNeeded(db: Database.Database): void {
  const row = db
    .prepare(`SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'facts'`)
    .get() as { sql?: string } | undefined;
  if (!row?.sql) return;
  if (row.sql.includes("'catalog'")) return; // already migrated
  if (!row.sql.includes('CHECK(source IN')) return; // no CHECK at all, nothing to fix

  const tx = db.transaction(() => {
    db.prepare(`
      CREATE TABLE facts_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        plant_id INTEGER REFERENCES plants(id),
        species TEXT,
        text TEXT,
        source TEXT CHECK(source IN ('seed', 'enrichment', 'catalog')),
        shown_count INTEGER DEFAULT 0,
        shown_at TEXT,
        is_disabled INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now'))
      )
    `).run();
    // species column may not exist in the old table (addColumnIfMissing
    // runs just before us, so it does, but we guard just in case).
    const cols = db.prepare(`PRAGMA table_info(facts)`).all() as Array<{ name: string }>;
    const hasSpecies = cols.some((c) => c.name === 'species');
    const speciesExpr = hasSpecies ? 'species' : 'NULL';
    const hasShownAt = cols.some((c) => c.name === 'shown_at');
    const shownAtExpr = hasShownAt ? 'shown_at' : 'NULL';
    db.prepare(
      `INSERT INTO facts_new (id, plant_id, species, text, source, shown_count, shown_at, is_disabled, created_at)
       SELECT id, plant_id, ${speciesExpr}, text, source, shown_count, ${shownAtExpr}, is_disabled, created_at FROM facts`
    ).run();
    db.prepare(`DROP TABLE facts`).run();
    db.prepare(`ALTER TABLE facts_new RENAME TO facts`).run();
  });
  tx();
}
