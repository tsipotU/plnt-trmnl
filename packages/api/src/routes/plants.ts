import { Router, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import type Database from 'better-sqlite3';
import { calculateNextWaterDate, calculateRepotAdjustment } from '../scheduling/engine.js';
import { logEvent, getEventsForPlant, logScheduleEvents } from '../database/event-log.js';
import { applySeasonalMultipliers, type SeasonalConfig } from '../scheduling/seasonal.js';
import { scheduleNextWater, type ScheduledPlant, type ScheduleResult } from '../scheduling/bin-packer.js';
import type { Config } from '../config.js';
import type { Catalog } from '../catalog/loader.js';
import type { PlantAbout } from '../catalog/types.js';

type HeatingSeasonConfig = Pick<Config, 'heatingSeasonStart' | 'heatingSeasonEnd'>;
// Full seasonal config (heating + growing) — accepted by waterPlant for #36.
// Back-compat: callers may still pass just the heating-season fields; the
// growing-season knobs then fall back to sensible defaults (Apr–Sep, 0.8/1.3).
type MaybeSeasonalConfig = HeatingSeasonConfig | SeasonalConfig | undefined;

const DEFAULT_GROWING_CONFIG: Pick<
  Config,
  'growingSeasonStart' | 'growingSeasonEnd' | 'growingSeasonMultiplier' | 'dormancyMultiplier'
> = {
  growingSeasonStart: { month: 4, day: 1 },
  growingSeasonEnd: { month: 9, day: 30 },
  growingSeasonMultiplier: 0.8,
  dormancyMultiplier: 1.3,
};

/**
 * Normalise a caller-provided config into a SeasonalConfig. When the caller
 * passes only heating-season fields (legacy signature / test fixtures), we
 * opt them OUT of the new growing/dormancy layer by neutralising its
 * multipliers to 1.0. Real prod wiring in `index.ts` always supplies the
 * full config.
 */
function toSeasonalConfig(cfg: MaybeSeasonalConfig): SeasonalConfig | undefined {
  if (!cfg) return undefined;
  const heating: HeatingSeasonConfig = {
    heatingSeasonStart: cfg.heatingSeasonStart,
    heatingSeasonEnd: cfg.heatingSeasonEnd,
  };
  const hasGrowing = 'growingSeasonStart' in cfg && 'growingSeasonMultiplier' in cfg;
  const growing = hasGrowing
    ? {
        growingSeasonStart: (cfg as SeasonalConfig).growingSeasonStart,
        growingSeasonEnd: (cfg as SeasonalConfig).growingSeasonEnd,
        growingSeasonMultiplier: (cfg as SeasonalConfig).growingSeasonMultiplier,
        dormancyMultiplier: (cfg as SeasonalConfig).dormancyMultiplier,
      }
    : {
        growingSeasonStart: DEFAULT_GROWING_CONFIG.growingSeasonStart,
        growingSeasonEnd: DEFAULT_GROWING_CONFIG.growingSeasonEnd,
        // Neutral — back-compat with legacy heating-only callers
        growingSeasonMultiplier: 1.0,
        dormancyMultiplier: 1.0,
      };
  return { ...heating, ...growing };
}

export interface WaterPlantOptions {
  batchId?: string;
  today?: string;
}

export interface WaterPlantResult {
  plant: Record<string, unknown>;
  batchId: string;
  scheduled: ScheduleResult;
  seasonalApplied: boolean;
}

/**
 * Core water-a-plant operation shared by POST /:id/water and POST /water-all.
 *
 * Captures pre-state JSON for undo, applies seasonal adjustment when configured,
 * funnels the ideal date through the bin-packer, logs the watered event + any
 * seasonal_adjustment event with the shared batchId. Overflow/congested events
 * logged by logScheduleEvents are intentionally left OUT of the batch (they
 * aren't part of the undo flow — see Task 9 caveat 3).
 */
export function waterPlant(
  db: Database.Database,
  plantId: number,
  heatingConfig: MaybeSeasonalConfig,
  options: WaterPlantOptions = {},
): WaterPlantResult {
  const plant = db.prepare(`SELECT * FROM plants WHERE id = ?`).get(plantId) as
    | Record<string, unknown>
    | undefined;
  if (!plant) throw new Error(`Plant ${plantId} not found`);

  const today = options.today ?? new Date().toISOString().split('T')[0];
  const batchId = options.batchId ?? randomUUID();
  const currentInterval = plant.current_interval as number;
  const modifier = plant.heating_season_modifier as number | null;

  const seasonalConfig = toSeasonalConfig(heatingConfig);
  const seasonal = seasonalConfig
    ? applySeasonalMultipliers({
        baseInterval: currentInterval,
        perPlantHeatingModifier: modifier,
        today,
        config: seasonalConfig,
      })
    : null;
  const effectiveInterval = seasonal?.interval ?? currentInterval;

  const idealDate = calculateNextWaterDate(today, effectiveInterval);
  const existing = db.prepare(
    `SELECT id, location, next_water_date as nextWaterDate
       FROM plants
       WHERE archived = 0 AND id != ? AND next_water_date IS NOT NULL`
  ).all(plantId) as ScheduledPlant[];
  const scheduled = scheduleNextWater(idealDate, (plant.location as string) ?? '', existing);

  const calibrationCycle = ((plant.calibration_cycle as number) ?? 0) + 1;
  const preState = JSON.stringify({
    last_watered_at: plant.last_watered_at ?? null,
    next_water_date: plant.next_water_date ?? null,
    calibration_cycle: plant.calibration_cycle ?? 0,
  });

  db.prepare(
    `UPDATE plants SET
       last_watered_at   = ?,
       next_water_date   = ?,
       calibration_cycle = ?,
       updated_at        = datetime('now')
     WHERE id = ?`
  ).run(today, scheduled.date, calibrationCycle, plantId);

  logEvent(db, {
    plantId,
    eventType: 'watered',
    oldValue: preState,
    newValue: today,
    reason: 'Plant watered',
    batchId,
  });

  const seasonalApplied = seasonal?.intervalChanged === true;
  if (seasonalApplied && seasonal) {
    logEvent(db, {
      plantId,
      eventType: 'seasonal_adjustment',
      oldValue: String(currentInterval),
      newValue: String(effectiveInterval),
      reason:
        seasonal.reason ||
        `Seasonal adjustment: interval ${currentInterval} → ${effectiveInterval}`,
      batchId,
    });
  }

  logScheduleEvents(db, plantId, scheduled);

  const updated = db.prepare(`SELECT * FROM plants WHERE id = ?`).get(plantId) as Record<
    string,
    unknown
  >;
  return { plant: updated, batchId, scheduled, seasonalApplied };
}

const VALID_POT_SIZE_CATEGORIES = [
  'Extra Small',
  'Small',
  'Medium',
  'Large',
  'Extra Large',
  'Other',
] as const;

const VALID_ORIGIN_TYPES = ['purchased', 'received', 'seedling', 'unknown'] as const;

/**
 * Soil-feel seeding map (issue #70). When the user picks "don't know" for
 * last-watered date on AddPlant, we ask how the soil feels and seed the
 * initial calibration interval from that reading. Base interval is 7 days;
 * bone-dry soil implies the plant dries faster than baseline (shorter
 * interval), wet soil implies it retains moisture longer (longer interval).
 */
const SOIL_FEEL_INTERVAL_MAP: Record<string, number> = {
  bone_dry: 5,
  dry: 6,
  slightly_moist: 7,
  moist: 8,
  wet: 9,
};
const VALID_SOIL_FEEL = Object.keys(SOIL_FEEL_INTERVAL_MAP);

/**
 * Catalog baseline hook (#2) — when AddPlant passes a `catalog_slug`, seed
 * the new plant's baselines from the catalog entry so the plant is useful
 * immediately instead of waiting for Claude enrichment. Claude enrichment
 * still runs in the background to refine calibration, conditions, and facts.
 *
 * Returns `null` when the slug is unknown or catalog isn't wired — caller
 * falls back to existing default-seeding logic (soil_feel / dryDaysBase).
 */
function applyCatalogBaseline(
  catalog: Catalog | undefined,
  catalogSlug: unknown,
): {
  baseInterval: number;
  lightPreference: string;
  species: string;
  imagePath: string | null;
} | null {
  if (!catalog) return null;
  if (typeof catalogSlug !== 'string' || catalogSlug.length === 0) return null;
  const entry = catalog.get(catalogSlug);
  if (!entry) return null;
  return {
    baseInterval: entry.care.base_interval_days,
    lightPreference: entry.care.light_preference,
    species: entry.latin_name,
    // #132 — copy through the catalog's bare filename. Loader has already
    // validated that this contains no path separators, so it's safe to
    // hand to the client which will fetch /api/illustrations/<filename>.
    imagePath: entry.image_path ?? null,
  };
}

/**
 * Seed species-specific catalog facts into the facts table (#4).
 *
 * Invariants:
 *  - Exactly 15 facts per catalog species; this function inserts them all
 *    with `source='catalog'`, `plant_id=plantId`, and `species` pinned to
 *    the catalog entry's canonical latin name.
 *  - Dedup across plants of the same species: if any `source='catalog'`
 *    facts already exist with this species, we do NOT re-insert. If those
 *    facts were previously soft-disabled (last plant of species archived
 *    before a new one was added), we re-enable them so the new plant sees
 *    them in rotation.
 *  - Enrichment path is untouched: enrichment facts use
 *    `source='enrichment'` and aren't affected by this helper.
 *
 * Returns the number of facts newly inserted (0 if dedup skipped or re-enabled).
 */
export function seedCatalogFacts(
  db: Database.Database,
  plantId: number,
  entry: { latin_name: string; facts: string[] },
): number {
  const existing = db.prepare(
    `SELECT COUNT(*) AS n FROM facts WHERE source = 'catalog' AND species = ?`,
  ).get(entry.latin_name) as { n: number };

  if (existing.n > 0) {
    // Dedup: re-enable any soft-disabled catalog facts for this species so
    // the new plant sees them in rotation, but don't insert duplicates.
    db.prepare(
      `UPDATE facts SET is_disabled = 0
       WHERE source = 'catalog' AND species = ? AND is_disabled = 1`,
    ).run(entry.latin_name);
    return 0;
  }

  const insert = db.prepare(
    `INSERT INTO facts (plant_id, species, text, source) VALUES (?, ?, ?, 'catalog')`,
  );
  const tx = db.transaction((facts: string[]) => {
    for (const text of facts) {
      insert.run(plantId, entry.latin_name, text);
    }
  });
  tx(entry.facts);
  return entry.facts.length;
}

/**
 * Build an "About this plant" payload from a catalog entry (#37).
 * Prefers the species string stored on the plant; falls back to common_name.
 * Returns null when no catalog match is found so the client can hide the card.
 */
function buildAbout(
  catalog: Catalog | undefined,
  plant: Record<string, unknown>,
): PlantAbout | null {
  if (!catalog) return null;
  const species = (plant.species as string | null) ?? null;
  const commonName = (plant.common_name as string | null) ?? null;
  const entry = catalog.findBySpecies(species) ?? catalog.findBySpecies(commonName);
  if (!entry) return null;
  return {
    common_names: {
      en: [...entry.common_names.en],
      nl: [...entry.common_names.nl],
    },
    origin: entry.origin,
    toxicity: entry.care.toxicity,
    lore: entry.lore,
    etymology: entry.etymology,
  };
}

export interface PlantsRouterConfig {
  heatingSeasonStart?: HeatingSeasonConfig['heatingSeasonStart'];
  heatingSeasonEnd?: HeatingSeasonConfig['heatingSeasonEnd'];
  growingSeasonStart?: Config['growingSeasonStart'];
  growingSeasonEnd?: Config['growingSeasonEnd'];
  growingSeasonMultiplier?: number;
  dormancyMultiplier?: number;
  dryDaysBase?: number;
}

export function createPlantsRouter(
  db: Database.Database,
  routerConfig?: PlantsRouterConfig | HeatingSeasonConfig,
  catalog?: Catalog,
): Router {
  const rc = routerConfig as PlantsRouterConfig | undefined;
  // Only activate the growing/dormancy layer when the caller provided its
  // knobs (prod wires them via index.ts). Legacy heating-only callers are
  // preserved by toSeasonalConfig's neutral fallback.
  const hasGrowingKnobs = rc
    ? rc.growingSeasonStart !== undefined || rc.growingSeasonMultiplier !== undefined
    : false;
  const heatingConfig: MaybeSeasonalConfig = rc
    ? hasGrowingKnobs
      ? {
          heatingSeasonStart: rc.heatingSeasonStart ?? { month: 10, day: 1 },
          heatingSeasonEnd: rc.heatingSeasonEnd ?? { month: 4, day: 1 },
          growingSeasonStart:
            rc.growingSeasonStart ?? DEFAULT_GROWING_CONFIG.growingSeasonStart,
          growingSeasonEnd: rc.growingSeasonEnd ?? DEFAULT_GROWING_CONFIG.growingSeasonEnd,
          growingSeasonMultiplier:
            rc.growingSeasonMultiplier ?? DEFAULT_GROWING_CONFIG.growingSeasonMultiplier,
          dormancyMultiplier:
            rc.dormancyMultiplier ?? DEFAULT_GROWING_CONFIG.dormancyMultiplier,
        }
      : {
          heatingSeasonStart: rc.heatingSeasonStart ?? { month: 10, day: 1 },
          heatingSeasonEnd: rc.heatingSeasonEnd ?? { month: 4, day: 1 },
        }
    : undefined;
  const dryDaysBase = rc?.dryDaysBase ?? 7;
  const router = Router();

  // GET /api/plants — list active plants ordered by next_water_date ASC
  // Accepts optional ?enrichment=pending to filter to plants awaiting enrichment.
  router.get('/', (req: Request, res: Response) => {
    const enrichmentFilter = typeof req.query.enrichment === 'string' ? req.query.enrichment : null;
    if (enrichmentFilter !== null && enrichmentFilter !== 'pending') {
      res.status(400).json({ error: "Unsupported enrichment filter: only 'pending' is accepted" });
      return;
    }
    let where = `archived = 0`;
    if (enrichmentFilter === 'pending') {
      where += ` AND enrichment_status = 'pending'`;
    }
    const plants = db.prepare(
      `SELECT * FROM plants WHERE ${where} ORDER BY next_water_date ASC`
    ).all();
    res.json(plants);
  });

  // GET /api/plants/archived — list archived plants, newest-archived first.
  // MUST be declared BEFORE '/:id' so Express doesn't match "archived" as an id.
  router.get('/archived', (_req: Request, res: Response) => {
    const plants = db.prepare(
      `SELECT * FROM plants WHERE archived = 1 ORDER BY archived_at DESC, id DESC`
    ).all();
    res.json(plants);
  });

  // GET /api/plants/:id — single plant with active conditions count
  router.get('/:id', (req: Request, res: Response) => {
    const plant = db.prepare(
      `SELECT p.*,
              (SELECT COUNT(*) FROM plant_conditions
               WHERE plant_id = p.id AND is_active = 1) AS active_conditions_count,
              (SELECT name FROM plants m
               WHERE m.id = p.mother_plant_id) AS mother_plant_name
       FROM plants p
       WHERE p.id = ?`
    ).get(req.params.id) as Record<string, unknown> | undefined;

    if (!plant) {
      res.status(404).json({ error: 'Plant not found' });
      return;
    }
    // #37 — attach "about this plant" catalog payload; null when no match.
    const about = buildAbout(catalog, plant);
    res.json({ ...plant, about });
  });

  // POST /api/plants — create a new plant
  router.post('/', (req: Request, res: Response) => {
    const { name, plantSize, identifier, location, lightLevel, lastWateredAt } = req.body;
    // Accept both camelCase (existing API) and snake_case (client payloads / dropdown form)
    const potSizeCm = req.body.potSizeCm ?? req.body.pot_size_cm;
    const potSizeCategory = req.body.pot_size_category;
    const originType = req.body.origin_type ?? req.body.originType;
    const originSource = req.body.origin_source ?? req.body.originSource;
    const motherPlantId = req.body.mother_plant_id ?? req.body.motherPlantId;
    const soilFeel = req.body.soil_feel ?? req.body.soilFeel;
    // #2 streamlined AddPlant — optional catalog slug applies baselines immediately.
    const catalogSlug = req.body.catalog_slug ?? req.body.catalogSlug;

    if (!name || !lastWateredAt) {
      res.status(400).json({ error: 'name and lastWateredAt are required' });
      return;
    }

    if (
      potSizeCategory != null &&
      (typeof potSizeCategory !== 'string' ||
        !(VALID_POT_SIZE_CATEGORIES as readonly string[]).includes(potSizeCategory))
    ) {
      res.status(400).json({ error: 'Invalid pot_size_category' });
      return;
    }

    if (
      originType != null &&
      (typeof originType !== 'string' ||
        !(VALID_ORIGIN_TYPES as readonly string[]).includes(originType))
    ) {
      res.status(400).json({ error: 'Invalid origin_type' });
      return;
    }

    if (
      soilFeel != null &&
      (typeof soilFeel !== 'string' || !VALID_SOIL_FEEL.includes(soilFeel))
    ) {
      res.status(400).json({ error: 'Invalid soil_feel' });
      return;
    }

    // Catalog baseline hook (#2) — resolved before soil-feel / dryDaysBase so
    // catalog entries provide a species-accurate base_interval when the user
    // hasn't overridden via soil_feel. User-supplied lightLevel wins when set.
    const catalogBaseline = applyCatalogBaseline(catalog, catalogSlug);

    // Interval precedence: soil_feel > catalog base_interval > dryDaysBase default.
    // Enrichment overwrites within seconds once Claude responds.
    const seededInterval =
      typeof soilFeel === 'string' ? SOIL_FEEL_INTERVAL_MAP[soilFeel] : null;
    const currentInterval =
      seededInterval ?? catalogBaseline?.baseInterval ?? dryDaysBase;
    const skipNextCalibration = seededInterval !== null ? 1 : 0;
    const nextWaterDate = calculateNextWaterDate(lastWateredAt, currentInterval);

    const effectiveLightLevel = lightLevel ?? catalogBaseline?.lightPreference ?? null;
    const effectiveSpecies = catalogBaseline?.species ?? null;
    // #132 — when the catalog entry ships an image_path, copy it through to
    // plants.illustration_path so the detail page hero renders immediately.
    // Enrichment may still overwrite this later via the callback's COALESCE.
    const effectiveIllustrationPath = catalogBaseline?.imagePath ?? null;

    const result = db.prepare(
      `INSERT INTO plants
         (name, species, pot_size_cm, pot_size_category, plant_size, identifier, location, light_level, base_interval, current_interval,
          last_watered_at, next_water_date, enrichment_status, origin_type, origin_source, mother_plant_id, skip_next_calibration, illustration_path)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?)`
    ).run(
      name,
      effectiveSpecies,
      potSizeCm ?? null,
      potSizeCategory ?? null,
      plantSize ?? null,
      identifier ?? null,
      location ?? null,
      effectiveLightLevel,
      currentInterval,
      currentInterval,
      lastWateredAt,
      nextWaterDate,
      originType ?? null,
      originSource ?? null,
      motherPlantId ?? null,
      skipNextCalibration,
      effectiveIllustrationPath,
    );

    const plantId = result.lastInsertRowid as number;

    if (seededInterval !== null) {
      logEvent(db, {
        plantId,
        eventType: 'calibration_seeded',
        newValue: soilFeel as string,
        reason: `Initial calibration seeded from soil feel: ${soilFeel} (interval=${seededInterval}d)`,
      });
    }

    // #4 — seed 15 species-specific catalog facts on plant creation.
    // Must run AFTER any catalog-baseline apply (#2) so the plant row is
    // in its final created state. No-op when no catalog is wired or the
    // name/species doesn't match an entry.
    if (catalog) {
      const entry = catalog.findBySpecies(name);
      if (entry && Array.isArray(entry.facts) && entry.facts.length > 0) {
        try {
          seedCatalogFacts(db, plantId, entry);
        } catch (err) {
          // Non-fatal: fact seeding should never block plant creation.
          // Enrichment will still add its own facts later.
          void err;
        }
      }
    }

    const plant = db.prepare(`SELECT * FROM plants WHERE id = ?`).get(plantId) as Record<string, unknown>;
    res.status(201).json(plant);
  });

  // GET /api/plants/:id/enrichment-status — poll for enrichment completion
  router.get('/:id/enrichment-status', (req: Request, res: Response) => {
    const plant = db.prepare(
      `SELECT id, enrichment_status, species, base_interval, water_description FROM plants WHERE id = ?`
    ).get(req.params.id) as Record<string, unknown> | undefined;

    if (!plant) {
      res.status(404).json({ error: 'Plant not found' });
      return;
    }
    res.json(plant);
  });

  // POST /api/plants/:id/retry-enrichment — re-run Claude enrichment, optionally
  // with a corrected plant name (used by the #39 did-you-mean fallback).
  router.post('/:id/retry-enrichment', (req: Request, res: Response) => {
    const plantId = Number(req.params.id);
    const plant = db.prepare(`SELECT * FROM plants WHERE id = ?`).get(plantId) as
      | Record<string, unknown>
      | undefined;

    if (!plant) {
      res.status(404).json({ error: 'Plant not found' });
      return;
    }

    const newName = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    if (newName.length > 0 && newName !== plant.name) {
      db.prepare(
        `UPDATE plants SET name = ?, updated_at = datetime('now') WHERE id = ?`
      ).run(newName, plantId);
      plant.name = newName;
    }

    db.prepare(
      `UPDATE plants SET enrichment_status = 'pending', updated_at = datetime('now') WHERE id = ?`
    ).run(plantId);

    res.json({ ok: true, id: plantId, name: plant.name });
  });

  // PUT /api/plants/:id — update plant fields
  router.put('/:id', (req: Request, res: Response) => {
    const plantId = Number(req.params.id);

    const existing = db.prepare(`SELECT * FROM plants WHERE id = ?`).get(plantId) as
      | Record<string, unknown>
      | undefined;

    if (!existing) {
      res.status(404).json({ error: 'Plant not found' });
      return;
    }

    const { name, plantSize, identifier, location, lightLevel, species } = req.body;
    // Accept both camelCase and snake_case for pot_size_cm (client sends snake_case)
    const potSizeCm = req.body.potSizeCm ?? req.body.pot_size_cm;
    const potSizeCategory = req.body.pot_size_category;
    const originType = req.body.origin_type ?? req.body.originType;
    const originSource = req.body.origin_source ?? req.body.originSource;
    const motherPlantId = req.body.mother_plant_id ?? req.body.motherPlantId;
    // Species correction (issue #74). If the client provides `species`, we
    // update the stored value and trigger re-enrichment when it actually
    // changes. A string value is stored verbatim; null/empty is ignored here
    // (clear-to-null isn't supported by this endpoint since enrichment owns
    // that column).
    const speciesProvided = typeof species === 'string' && species.trim().length > 0;
    const trimmedSpecies = speciesProvided ? (species as string).trim() : null;
    const oldSpecies = existing.species as string | null;
    const speciesChanged = speciesProvided && trimmedSpecies !== oldSpecies;

    if (
      potSizeCategory != null &&
      (typeof potSizeCategory !== 'string' ||
        !(VALID_POT_SIZE_CATEGORIES as readonly string[]).includes(potSizeCategory))
    ) {
      res.status(400).json({ error: 'Invalid pot_size_category' });
      return;
    }

    if (
      originType != null &&
      (typeof originType !== 'string' ||
        !(VALID_ORIGIN_TYPES as readonly string[]).includes(originType))
    ) {
      res.status(400).json({ error: 'Invalid origin_type' });
      return;
    }

    let newInterval = existing.current_interval as number;
    let isConverged = existing.is_converged as number;
    let nextWaterDate = existing.next_water_date as string;

    const oldPotSizeCm = existing.pot_size_cm as number | null;
    const potSizeChanged =
      potSizeCm !== undefined &&
      oldPotSizeCm !== null &&
      oldPotSizeCm !== undefined &&
      potSizeCm !== oldPotSizeCm;

    let scheduledOnPut: ReturnType<typeof scheduleNextWater> | null = null;

    if (potSizeChanged && oldPotSizeCm) {
      newInterval = calculateRepotAdjustment(newInterval, oldPotSizeCm, potSizeCm);
      isConverged = 0;

      // Recalculate next_water_date from last_watered_at if available,
      // funneling through scheduleNextWater so we get overflow/congested metadata.
      const lastWatered = existing.last_watered_at as string | null;
      if (lastWatered) {
        const idealDate = calculateNextWaterDate(lastWatered, newInterval);
        const activeSchedule = db.prepare(
          `SELECT id, location, next_water_date as nextWaterDate
             FROM plants
             WHERE archived = 0 AND id != ? AND next_water_date IS NOT NULL`
        ).all(plantId) as ScheduledPlant[];
        scheduledOnPut = scheduleNextWater(
          idealDate,
          (existing.location as string) ?? '',
          activeSchedule,
        );
        nextWaterDate = scheduledOnPut.date;
      }

      logEvent(db, {
        plantId,
        eventType: 'repot',
        oldValue: String(oldPotSizeCm),
        newValue: String(potSizeCm),
        reason: `Pot size changed from ${oldPotSizeCm}cm to ${potSizeCm}cm`,
      });
    }

    db.prepare(
      `UPDATE plants SET
         name              = COALESCE(?, name),
         species           = COALESCE(?, species),
         pot_size_cm       = COALESCE(?, pot_size_cm),
         pot_size_category = COALESCE(?, pot_size_category),
         plant_size        = COALESCE(?, plant_size),
         identifier        = CASE WHEN ? = 1 THEN ? ELSE identifier END,
         location          = COALESCE(?, location),
         light_level       = COALESCE(?, light_level),
         origin_type       = COALESCE(?, origin_type),
         origin_source     = CASE WHEN ? = 1 THEN ? ELSE origin_source END,
         mother_plant_id   = CASE WHEN ? = 1 THEN ? ELSE mother_plant_id END,
         current_interval  = ?,
         is_converged      = ?,
         next_water_date   = ?,
         enrichment_status = CASE WHEN ? = 1 THEN 'pending' ELSE enrichment_status END,
         updated_at        = datetime('now')
       WHERE id = ?`
    ).run(
      name ?? null,
      trimmedSpecies,
      potSizeCm ?? null,
      potSizeCategory ?? null,
      plantSize ?? null,
      identifier !== undefined ? 1 : 0,
      identifier ?? null,
      location ?? null,
      lightLevel ?? null,
      originType ?? null,
      originSource !== undefined ? 1 : 0,
      originSource ?? null,
      motherPlantId !== undefined ? 1 : 0,
      motherPlantId ?? null,
      newInterval,
      isConverged,
      nextWaterDate,
      speciesChanged ? 1 : 0,
      plantId
    );

    if (scheduledOnPut) {
      logScheduleEvents(db, plantId, scheduledOnPut);
    }

    // Species correction — log event and kick off re-enrichment.
    if (speciesChanged) {
      logEvent(db, {
        plantId,
        eventType: 'species_corrected',
        oldValue: oldSpecies,
        newValue: trimmedSpecies,
        reason: `Species corrected: ${oldSpecies ?? '—'} → ${trimmedSpecies}`,
      });

    }

    const updated = db.prepare(`SELECT * FROM plants WHERE id = ?`).get(plantId);
    res.json(updated);
  });

  // POST /api/plants/water-all — batch water plants (all due or a given id list).
  // IMPORTANT: must be declared BEFORE '/:id/water' routes so Express doesn't match
  // 'water-all' as :id.
  router.post('/water-all', (req: Request, res: Response) => {
    const today = new Date().toISOString().split('T')[0];
    const requestedIds = Array.isArray(req.body?.plant_ids)
      ? (req.body.plant_ids as number[])
      : null;

    let plantIds: number[];
    if (requestedIds) {
      if (requestedIds.length === 0) {
        res.json({ batch_id: randomUUID(), watered: [] });
        return;
      }
      const placeholders = requestedIds.map(() => '?').join(',');
      const found = db
        .prepare(
          `SELECT id FROM plants WHERE archived = 0 AND id IN (${placeholders})`,
        )
        .all(...requestedIds) as { id: number }[];
      if (found.length !== requestedIds.length) {
        res.status(404).json({ error: 'Unknown or archived plant id(s)' });
        return;
      }
      plantIds = requestedIds;
    } else {
      plantIds = (
        db
          .prepare(
            `SELECT id FROM plants WHERE archived = 0 AND next_water_date <= ?`,
          )
          .all(today) as { id: number }[]
      ).map((r) => r.id);
    }

    const batchId = randomUUID();
    const watered: unknown[] = [];
    for (const pid of plantIds) {
      const result = waterPlant(db, pid, heatingConfig, { batchId, today });
      watered.push(result.plant);
    }
    res.json({ batch_id: batchId, watered });
  });

  // POST /api/plants/undo-batch — restore all plants in a batch and delete its events.
  router.post('/undo-batch', (req: Request, res: Response) => {
    const batchId = req.body?.batch_id;
    if (typeof batchId !== 'string' || !batchId) {
      res.status(400).json({ error: 'batch_id required' });
      return;
    }

    const events = db
      .prepare(
        `SELECT id, plant_id, old_value FROM event_log
         WHERE batch_id = ? AND event_type = 'watered'`,
      )
      .all(batchId) as { id: number; plant_id: number; old_value: string | null }[];

    if (events.length === 0) {
      res.status(404).json({ error: 'No events for batch_id' });
      return;
    }

    const restored: unknown[] = [];
    const tx = db.transaction(() => {
      for (const ev of events) {
        if (!ev.old_value) continue;
        const pre = JSON.parse(ev.old_value) as {
          last_watered_at: string | null;
          next_water_date: string | null;
          calibration_cycle: number;
        };
        db.prepare(
          `UPDATE plants SET
             last_watered_at   = ?,
             next_water_date   = ?,
             calibration_cycle = ?,
             updated_at        = datetime('now')
           WHERE id = ?`,
        ).run(pre.last_watered_at, pre.next_water_date, pre.calibration_cycle, ev.plant_id);

        const p = db.prepare(`SELECT * FROM plants WHERE id = ?`).get(ev.plant_id);
        restored.push(p);
      }
      // Delete ALL events tied to this batch (watered + seasonal_adjustment).
      // Overflow/congested events aren't part of the batch (see waterPlant).
      db.prepare(`DELETE FROM event_log WHERE batch_id = ?`).run(batchId);
    });
    tx();

    res.json({ restored });
  });

  // POST /api/plants/:id/water — mark as watered (single-plant path).
  // Shares the exact same logic as /water-all via the waterPlant helper.
  router.post('/:id/water', (req: Request, res: Response) => {
    const plantId = Number(req.params.id);

    const plant = db.prepare(`SELECT id FROM plants WHERE id = ?`).get(plantId);
    if (!plant) {
      res.status(404).json({ error: 'Plant not found' });
      return;
    }

    const result = waterPlant(db, plantId, heatingConfig);
    res.json(result.plant);
  });

  // POST /api/plants/:id/undo-water — revert the last watering + remove the event
  router.post('/:id/undo-water', (req: Request, res: Response) => {
    const plantId = Number(req.params.id);

    const plant = db.prepare(`SELECT id FROM plants WHERE id = ?`).get(plantId);
    if (!plant) {
      res.status(404).json({ error: 'Plant not found' });
      return;
    }

    const lastWatered = db.prepare(
      `SELECT id, old_value FROM event_log
       WHERE plant_id = ? AND event_type = 'watered'
       ORDER BY created_at DESC, id DESC LIMIT 1`
    ).get(plantId) as { id: number; old_value: string | null } | undefined;

    if (!lastWatered || !lastWatered.old_value) {
      res.status(400).json({ error: 'No undoable watering found' });
      return;
    }

    let preState: { last_watered_at: string | null; next_water_date: string | null; calibration_cycle: number };
    try {
      preState = JSON.parse(lastWatered.old_value);
    } catch {
      res.status(400).json({ error: 'Watering event has no restorable state' });
      return;
    }

    db.prepare(
      `UPDATE plants SET
         last_watered_at   = ?,
         next_water_date   = ?,
         calibration_cycle = ?,
         updated_at        = datetime('now')
       WHERE id = ?`
    ).run(
      preState.last_watered_at,
      preState.next_water_date,
      preState.calibration_cycle,
      plantId,
    );

    db.prepare(`DELETE FROM event_log WHERE id = ?`).run(lastWatered.id);

    const updated = db.prepare(`SELECT * FROM plants WHERE id = ?`).get(plantId);
    res.json(updated);
  });

  // GET /api/plants/:id/events — paginated event history (newest first)
  router.get('/:id/events', (req: Request, res: Response) => {
    const plantId = Number(req.params.id);

    const plant = db.prepare(`SELECT id FROM plants WHERE id = ?`).get(plantId);
    if (!plant) {
      res.status(404).json({ error: 'Plant not found' });
      return;
    }

    const rawLimit = Number(req.query.limit);
    const limit = Number.isFinite(rawLimit) && rawLimit > 0
      ? Math.min(Math.floor(rawLimit), 200)
      : 50;

    const events = getEventsForPlant(db, plantId, limit);
    res.json(events);
  });

  // POST /api/plants/:id/archive — archive a plant with reason + optional note
  router.post('/:id/archive', (req: Request, res: Response) => {
    const plantId = Number(req.params.id);

    const plant = db.prepare(`SELECT * FROM plants WHERE id = ?`).get(plantId) as
      | Record<string, unknown>
      | undefined;

    if (!plant) {
      res.status(404).json({ error: 'Plant not found' });
      return;
    }

    const { reason, note } = req.body as { reason?: unknown; note?: unknown };
    const VALID_REASONS = ['died', 'gave_away', 'moved', 'other'] as const;
    if (typeof reason !== 'string' || !VALID_REASONS.includes(reason as (typeof VALID_REASONS)[number])) {
      res.status(400).json({
        error: 'reason is required and must be one of: died, gave_away, moved, other',
      });
      return;
    }
    const archiveNote = typeof note === 'string' && note.trim().length > 0 ? note.trim() : null;

    db.prepare(
      `UPDATE plants SET
         archived       = 1,
         archived_at    = datetime('now'),
         archive_reason = ?,
         archive_note   = ?,
         updated_at     = datetime('now')
       WHERE id = ?`
    ).run(reason, archiveNote, plantId);

    // Soft-disable species-specific facts when this was the last plant of
    // the species. Enrichment facts are tied to the archived plant's id;
    // catalog facts (#4) are shared across plants of the species and keyed
    // by the `facts.species` column — so we disable via both columns.
    const species = plant.species as string | null;
    if (species) {
      const remainingOfSpecies = db.prepare(
        `SELECT COUNT(*) AS n FROM plants WHERE species = ? AND archived = 0 AND id != ?`
      ).get(species, plantId) as { n: number };
      if (remainingOfSpecies.n === 0) {
        db.prepare(
          `UPDATE facts SET is_disabled = 1 WHERE plant_id = ? OR species = ?`
        ).run(plantId, species);
      }
    }

    logEvent(db, {
      plantId,
      eventType: 'archived',
      newValue: reason,
      reason: archiveNote
        ? `Plant archived (${reason}): ${archiveNote}`
        : `Plant archived (${reason})`,
    });

    const updated = db.prepare(`SELECT * FROM plants WHERE id = ?`).get(plantId) as Record<
      string,
      unknown
    >;

    // Memorial: days between created_at and archived_at
    const createdAt = updated.created_at as string;
    const archivedAt = updated.archived_at as string;
    const careDurationDays = Math.max(
      0,
      Math.floor(
        (new Date(archivedAt).getTime() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24)
      )
    );

    res.json({ ...updated, care_duration_days: careDurationDays });
  });

  // GET /api/plants/:id/memorial — plant + lifetime stats for the memorial page
  router.get('/:id/memorial', (req: Request, res: Response) => {
    const plantId = Number(req.params.id);
    const plant = db.prepare(`SELECT * FROM plants WHERE id = ?`).get(plantId) as
      | Record<string, unknown>
      | undefined;
    if (!plant) {
      res.status(404).json({ error: 'Plant not found' });
      return;
    }

    const wateringsRow = db
      .prepare(
        `SELECT COUNT(*) AS n FROM event_log WHERE plant_id = ? AND event_type = 'watered'`
      )
      .get(plantId) as { n: number };

    const offspringRow = db
      .prepare(`SELECT COUNT(*) AS n FROM plants WHERE mother_plant_id = ?`)
      .get(plantId) as { n: number };

    const createdAt = plant.created_at as string;
    const archivedAt = (plant.archived_at as string | null) ?? null;
    const lifespanDays = archivedAt
      ? Math.max(
          0,
          Math.floor(
            (new Date(archivedAt).getTime() - new Date(createdAt).getTime()) /
              (1000 * 60 * 60 * 24)
          )
        )
      : 0;

    res.json({
      plant,
      stats: {
        waterings: wateringsRow.n,
        offspring: offspringRow.n,
        calibration_cycles: (plant.calibration_cycle as number) ?? 0,
        lifespan_days: lifespanDays,
        joined_at: createdAt,
        archived_at: archivedAt,
      },
    });
  });

  // POST /api/plants/:id/restore — un-archive a plant; idempotent on non-archived
  router.post('/:id/restore', (req: Request, res: Response) => {
    const plantId = Number(req.params.id);
    const plant = db.prepare(`SELECT * FROM plants WHERE id = ?`).get(plantId) as
      | Record<string, unknown>
      | undefined;
    if (!plant) {
      res.status(404).json({ error: 'Plant not found' });
      return;
    }

    const wasArchived = (plant.archived as number) === 1;

    db.prepare(
      `UPDATE plants SET
         archived       = 0,
         archived_at    = NULL,
         archive_reason = NULL,
         archive_note   = NULL,
         updated_at     = datetime('now')
       WHERE id = ?`
    ).run(plantId);

    // Re-enable species facts that were soft-disabled at archive time
    const species = plant.species as string | null;
    if (species) {
      db.prepare(
        `UPDATE facts SET is_disabled = 0 WHERE plant_id = ? OR species = ?`
      ).run(plantId, species);
    }

    if (wasArchived) {
      logEvent(db, {
        plantId,
        eventType: 'restored',
        reason: 'Plant restored from archive',
      });
    }

    const updated = db.prepare(`SELECT * FROM plants WHERE id = ?`).get(plantId) as Record<
      string,
      unknown
    >;
    res.json({ plant: updated });
  });

  return router;
}
