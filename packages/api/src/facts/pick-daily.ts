import type Database from 'better-sqlite3';

/**
 * Issue #38 — Daily rotating plant facts.
 *
 * Pool rules:
 *  - `is_disabled = 0`
 *  - If `plant_id IS NOT NULL`, the referenced plant must exist and not be archived.
 *
 * The pool splits into two buckets:
 *  - "plant" bucket: facts tied to a plant the user owns (plant_id → non-archived).
 *    `source='catalog'` facts always have a plant_id; enrichment facts usually do.
 *  - "generic" bucket: facts with plant_id IS NULL (seed facts, general).
 *
 * Weighted selection (~60% plant / ~40% generic) favours plants the user actually
 * owns, but falls back gracefully when only one bucket has picks available.
 *
 * Within a bucket we prefer facts with `shown_at IS NULL` (never shown this
 * cycle), then the least-recently-shown. Random tie-break.
 *
 * Cycling: if the chosen bucket has no unshown facts, we reset `shown_at = NULL`
 * for every fact in that bucket and then pick again.
 *
 * On selection, `shown_at` is set to `datetime('now')` and `shown_count` is
 * incremented.
 */

export interface PickedFact {
  id: number;
  text: string;
  source: string | null;
  plant_id: number | null;
  species: string | null;
  shown_at: string | null;
  shown_count: number;
}

interface FactRow {
  id: number;
  text: string;
  source: string | null;
  plant_id: number | null;
  species: string | null;
  shown_at: string | null;
  shown_count: number;
  archived: number | null;
}

// Candidate SQL — joins plants so we can filter archived plants.
// Use LEFT JOIN so facts with plant_id IS NULL (generic) still appear.
const BASE_SQL = `
  SELECT f.id, f.text, f.source, f.plant_id, f.species, f.shown_at, f.shown_count,
         p.archived AS archived
  FROM facts f
  LEFT JOIN plants p ON p.id = f.plant_id
  WHERE f.is_disabled = 0
    AND (f.plant_id IS NULL OR p.archived = 0)
`;

type Bucket = 'plant' | 'generic';

function eligibleFacts(db: Database.Database): FactRow[] {
  return db.prepare(BASE_SQL).all() as FactRow[];
}

function partition(facts: FactRow[]): { plant: FactRow[]; generic: FactRow[] } {
  const plant: FactRow[] = [];
  const generic: FactRow[] = [];
  for (const f of facts) {
    if (f.plant_id != null) plant.push(f);
    else generic.push(f);
  }
  return { plant, generic };
}

function chooseBucket(
  hasPlant: boolean,
  hasGeneric: boolean,
  rand: () => number,
  plantWeight = 0.6,
): Bucket | null {
  if (hasPlant && hasGeneric) return rand() < plantWeight ? 'plant' : 'generic';
  if (hasPlant) return 'plant';
  if (hasGeneric) return 'generic';
  return null;
}

function pickFromBucket(
  db: Database.Database,
  bucket: FactRow[],
  bucketKind: Bucket,
  rand: () => number,
): FactRow {
  // Prefer unshown (shown_at IS NULL) first.
  let unshown = bucket.filter((f) => f.shown_at == null);
  if (unshown.length === 0) {
    // All facts in this bucket have been shown — reset the cycle for this bucket.
    resetBucket(db, bucketKind);
    // Refresh bucket rows (they all have shown_at = NULL now).
    unshown = bucket.map((f) => ({ ...f, shown_at: null }));
  }
  const idx = Math.floor(rand() * unshown.length);
  return unshown[Math.min(idx, unshown.length - 1)];
}

function resetBucket(db: Database.Database, bucketKind: Bucket): void {
  if (bucketKind === 'plant') {
    db.prepare(
      `UPDATE facts SET shown_at = NULL
       WHERE is_disabled = 0
         AND plant_id IS NOT NULL
         AND plant_id IN (SELECT id FROM plants WHERE archived = 0)`,
    ).run();
  } else {
    db.prepare(
      `UPDATE facts SET shown_at = NULL
       WHERE is_disabled = 0 AND plant_id IS NULL`,
    ).run();
  }
}

export interface PickDailyOptions {
  /** Override RNG for deterministic tests. Returns [0, 1). */
  rand?: () => number;
  /** Override plant-bucket weight (0..1). Default 0.6. */
  plantWeight?: number;
}

/**
 * Pick today's fact, set shown_at = now, increment shown_count.
 * Returns null when no eligible facts exist.
 */
export function pickDailyFact(
  db: Database.Database,
  opts: PickDailyOptions = {},
): PickedFact | null {
  const rand = opts.rand ?? Math.random;
  const plantWeight = opts.plantWeight ?? 0.6;

  const facts = eligibleFacts(db);
  if (facts.length === 0) return null;

  const { plant, generic } = partition(facts);
  const bucketKind = chooseBucket(plant.length > 0, generic.length > 0, rand, plantWeight);
  if (bucketKind == null) return null;

  const bucket = bucketKind === 'plant' ? plant : generic;
  const chosen = pickFromBucket(db, bucket, bucketKind, rand);

  db.prepare(
    `UPDATE facts
     SET shown_at = datetime('now'),
         shown_count = shown_count + 1
     WHERE id = ?`,
  ).run(chosen.id);

  const fresh = db
    .prepare(
      `SELECT id, text, source, plant_id, species, shown_at, shown_count
       FROM facts WHERE id = ?`,
    )
    .get(chosen.id) as PickedFact;

  // Also store today's pick in app_state so the screen route can surface it
  // without reselecting.
  const today = new Date().toISOString().slice(0, 10);
  db.prepare(
    `INSERT INTO app_state (key, value, updated_at)
     VALUES ('today_fact', ?, datetime('now'))
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`,
  ).run(JSON.stringify({ id: fresh.id, date: today }));

  return fresh;
}

/**
 * Read today's fact from app_state, if one was picked today. Returns null if
 * no pick has happened today (renderer/screen should call pickDailyFact to
 * seed the day).
 */
export function getTodayFact(
  db: Database.Database,
  today = new Date().toISOString().slice(0, 10),
): PickedFact | null {
  const row = db
    .prepare(`SELECT value FROM app_state WHERE key = 'today_fact'`)
    .get() as { value: string } | undefined;
  if (!row) return null;
  let parsed: { id: number; date: string };
  try {
    parsed = JSON.parse(row.value) as { id: number; date: string };
  } catch {
    return null;
  }
  if (parsed.date !== today) return null;
  const fact = db
    .prepare(
      `SELECT id, text, source, plant_id, species, shown_at, shown_count
       FROM facts WHERE id = ? AND is_disabled = 0`,
    )
    .get(parsed.id) as PickedFact | undefined;
  return fact ?? null;
}
