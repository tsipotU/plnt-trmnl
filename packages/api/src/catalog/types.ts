/**
 * Catalog entry for a single plant species.
 *
 * Canonical shape used by the catalog JSON file, loader, and search API.
 * Pairs with `packages/api/catalog/plants.json`.
 *
 * NOTE: #3 adds `light_profile`, `placement_tips`, and `conditions` (15 per species).
 * `light_profile.ideal` unblocks #76 (location-light mismatch badge).
 */
export type PlantCategory =
  | 'foliage'
  | 'flowering'
  | 'succulents'
  | 'cacti'
  | 'indoor_trees'
  | 'ferns'
  | 'palms'
  | 'air_plants'
  | 'orchids'
  | 'carnivorous'
  | 'herbs'
  | 'terrarium';

export type LightPreference = 'low' | 'medium' | 'bright_indirect' | 'direct';
export type SizeCategory = 'small' | 'medium' | 'large' | 'tree';
export type Difficulty = 'beginner' | 'intermediate' | 'expert';
export type ConditionSeverity = 'info' | 'warning' | 'critical';

export interface CatalogEntryCare {
  base_interval_days: number;
  light_preference: LightPreference;
  placement_hints: string;
  toxicity: string;
  size_category: SizeCategory;
  difficulty: Difficulty;
}

/**
 * Light profile — #3.
 * `ideal` is the canonical preference; `tolerance_min`/`max` define the acceptable range.
 * `direct_sun_hours` is a short human string (e.g. "Max 2 hours morning sun", "None").
 * `ideal` unblocks #76 (location-light mismatch badge).
 */
export interface LightProfile {
  ideal: LightPreference;
  tolerance_min: LightPreference;
  tolerance_max: LightPreference;
  direct_sun_hours: string;
  too_little_symptoms: string;
  too_much_symptoms: string;
}

/**
 * Catalog condition — one of 15 per species.
 * `is_common` flags the 5 most frequently encountered (highlighted in the UI).
 */
export interface CatalogCondition {
  name: string;
  symptoms: string;
  remedy: string;
  severity: ConditionSeverity;
  prevention: string;
  is_common: boolean;
}

export interface CatalogEntry {
  slug: string;
  latin_name: string;
  aliases: string[];
  common_names: {
    en: string[];
    nl: string[];
  };
  category: PlantCategory;
  care: CatalogEntryCare;
  origin: string;
  common_conditions: string[];
  light_profile: LightProfile;
  placement_tips: string[];
  conditions: CatalogCondition[];
  /** Folk history, cultural notes (issue #37). Optional — not all entries populated. */
  lore?: string;
  /** Naming origin / word roots (issue #37). Optional. */
  etymology?: string;
  /**
   * Optional bare filename of a botanical illustration shipped under
   * `packages/api/assets/catalog-images/` (issue #132). Served via
   * `/api/illustrations/:filename`. When present, copied to
   * `plants.illustration_path` on POST /api/plants and via the enrichment
   * callback. Must be a bare filename (no '/' or '..').
   */
  image_path?: string;
  /**
   * Species-specific facts (issue #4). Exactly 15 per species, seeded into
   * the facts table on plant creation with `source='catalog'`. Mix of care
   * tips (≥3), botanical trivia (≥3), cultural/historical (≥2), and
   * fun/surprising (≥2). Rest is free-form.
   */
  facts: string[];
}

/**
 * "About this plant" payload returned alongside GET /api/plants/:id.
 * Sourced from the catalog by species match. Null when no match.
 */
export interface PlantAbout {
  common_names: {
    en: string[];
    nl: string[];
  };
  origin: string;
  toxicity: string;
  lore?: string;
  etymology?: string;
}

/** Shape returned by GET /api/catalog/search. */
export interface CatalogSearchResult {
  slug: string;
  latin_name: string;
  category: PlantCategory;
  primary_common_name: string;
}
