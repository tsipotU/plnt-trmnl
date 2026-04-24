/**
 * Catalog entry for a single plant species.
 *
 * Canonical shape used by the catalog JSON file, loader, and search API.
 * Pairs with `packages/api/catalog/plants.json`.
 *
 * NOTE: #1a scaffold. Richer fields (light_profile, placement_tips,
 * species-level facts, lore) arrive in #3 / #4 / #37.
 */
export type PlantCategory =
  | 'foliage'
  | 'flowering'
  | 'succulents'
  | 'cacti'
  | 'indoor_trees'
  | 'ferns'
  | 'palms'
  | 'air_plants';

export type LightPreference = 'low' | 'medium' | 'bright_indirect' | 'direct';
export type SizeCategory = 'small' | 'medium' | 'large' | 'tree';
export type Difficulty = 'beginner' | 'intermediate' | 'expert';

export interface CatalogEntryCare {
  base_interval_days: number;
  light_preference: LightPreference;
  placement_hints: string;
  toxicity: string;
  size_category: SizeCategory;
  difficulty: Difficulty;
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
  /** Folk history, cultural notes (issue #37). Optional — not all entries populated. */
  lore?: string;
  /** Naming origin / word roots (issue #37). Optional. */
  etymology?: string;
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
