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
      enrichment_status TEXT DEFAULT 'pending' CHECK(enrichment_status IN ('pending', 'complete', 'failed')),
      archived INTEGER DEFAULT 0,
      archived_at TEXT,
      archive_reason TEXT CHECK(archive_reason IN ('died', 'gave_away', 'moved', 'other')),
      archive_note TEXT,
      origin_type TEXT CHECK(origin_type IN ('purchased', 'received', 'seedling', 'unknown')),
      origin_source TEXT,
      mother_plant_id INTEGER REFERENCES plants(id),
      notes TEXT,
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
      text TEXT,
      source TEXT CHECK(source IN ('seed', 'enrichment')),
      shown_count INTEGER DEFAULT 0,
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
