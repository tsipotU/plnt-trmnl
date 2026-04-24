import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type {
  CatalogEntry,
  CatalogSearchResult,
  PlantCategory,
  LightPreference,
  SizeCategory,
  Difficulty,
} from './types.js';

const VALID_CATEGORIES: readonly PlantCategory[] = [
  'foliage',
  'flowering',
  'succulents',
  'cacti',
  'indoor_trees',
  'ferns',
  'palms',
  'air_plants',
];
const VALID_LIGHT: readonly LightPreference[] = ['low', 'medium', 'bright_indirect', 'direct'];
const VALID_SIZE: readonly SizeCategory[] = ['small', 'medium', 'large', 'tree'];
const VALID_DIFFICULTY: readonly Difficulty[] = ['beginner', 'intermediate', 'expert'];

export interface Catalog {
  all(): readonly CatalogEntry[];
  get(slug: string): CatalogEntry | undefined;
  search(query: string, limit?: number): CatalogSearchResult[];
}

interface IndexedEntry {
  entry: CatalogEntry;
  haystacks: string[]; // lowercased strings matched against query
  tokens: string[]; // lowercased tokens for prefix match
}

/** Resolve the default catalog JSON path relative to this module. */
export function defaultCatalogPath(): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  // src/catalog/loader.ts  (dev/tsx)  -> ../../catalog/plants.json
  // dist/catalog/loader.js (prod)     -> ../../catalog/plants.json
  return path.resolve(here, '..', '..', 'catalog', 'plants.json');
}

/**
 * Read, parse, and validate the catalog JSON file.
 * Returns a Catalog with an in-memory search index.
 * Throws on any structural issue so boot fails loudly.
 */
export function loadCatalog(filePath: string = defaultCatalogPath()): Catalog {
  let raw: string;
  try {
    raw = fs.readFileSync(filePath, 'utf-8');
  } catch (err) {
    throw new Error(`Failed to read catalog file at ${filePath}: ${(err as Error).message}`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error(`Failed to parse catalog JSON at ${filePath}: ${(err as Error).message}`);
  }

  if (!Array.isArray(parsed)) {
    throw new Error(`Catalog JSON must be an array of entries (got ${typeof parsed})`);
  }

  const entries = parsed.map((raw, i) => validateEntry(raw, i));

  // Duplicate-slug guard
  const seen = new Set<string>();
  for (const e of entries) {
    if (seen.has(e.slug)) {
      throw new Error(`Catalog contains duplicate slug: ${e.slug}`);
    }
    seen.add(e.slug);
  }

  return createCatalog(entries);
}

function validateEntry(raw: unknown, index: number): CatalogEntry {
  const loc = `entry[${index}]`;
  if (!raw || typeof raw !== 'object') {
    throw new Error(`${loc} is not an object`);
  }
  const e = raw as Record<string, unknown>;

  requireString(e.slug, `${loc}.slug`);
  requireString(e.latin_name, `${loc}.latin_name`);
  requireStringArray(e.aliases, `${loc}.aliases`);

  if (!e.common_names || typeof e.common_names !== 'object') {
    throw new Error(`${loc}.common_names must be an object`);
  }
  const cn = e.common_names as Record<string, unknown>;
  requireStringArray(cn.en, `${loc}.common_names.en`);
  requireStringArray(cn.nl, `${loc}.common_names.nl`);
  if (cn.en.length === 0) throw new Error(`${loc}.common_names.en must have at least one entry`);
  if (cn.nl.length === 0) throw new Error(`${loc}.common_names.nl must have at least one entry`);

  const category = e.category;
  if (typeof category !== 'string' || !VALID_CATEGORIES.includes(category as PlantCategory)) {
    throw new Error(
      `${loc}.category must be one of ${VALID_CATEGORIES.join(', ')} (got ${String(category)})`
    );
  }

  if (!e.care || typeof e.care !== 'object') {
    throw new Error(`${loc}.care must be an object`);
  }
  const care = e.care as Record<string, unknown>;
  if (typeof care.base_interval_days !== 'number' || care.base_interval_days <= 0) {
    throw new Error(`${loc}.care.base_interval_days must be a positive number`);
  }
  if (typeof care.light_preference !== 'string' ||
      !VALID_LIGHT.includes(care.light_preference as LightPreference)) {
    throw new Error(`${loc}.care.light_preference invalid: ${String(care.light_preference)}`);
  }
  requireString(care.placement_hints, `${loc}.care.placement_hints`);
  requireString(care.toxicity, `${loc}.care.toxicity`);
  if (typeof care.size_category !== 'string' ||
      !VALID_SIZE.includes(care.size_category as SizeCategory)) {
    throw new Error(`${loc}.care.size_category invalid: ${String(care.size_category)}`);
  }
  if (typeof care.difficulty !== 'string' ||
      !VALID_DIFFICULTY.includes(care.difficulty as Difficulty)) {
    throw new Error(`${loc}.care.difficulty invalid: ${String(care.difficulty)}`);
  }

  requireString(e.origin, `${loc}.origin`);
  requireStringArray(e.common_conditions, `${loc}.common_conditions`);

  return raw as unknown as CatalogEntry;
}

function requireString(v: unknown, loc: string): asserts v is string {
  if (typeof v !== 'string' || v.length === 0) {
    throw new Error(`${loc} must be a non-empty string`);
  }
}

function requireStringArray(v: unknown, loc: string): asserts v is string[] {
  if (!Array.isArray(v) || !v.every(x => typeof x === 'string')) {
    throw new Error(`${loc} must be an array of strings`);
  }
}

/**
 * Build an in-memory catalog from entries. Exported for tests and callers
 * that already have the parsed list.
 */
export function createCatalog(entries: readonly CatalogEntry[]): Catalog {
  const bySlug = new Map<string, CatalogEntry>();
  const indexed: IndexedEntry[] = [];

  for (const entry of entries) {
    bySlug.set(entry.slug, entry);
    const haystacks = [
      entry.latin_name,
      ...entry.aliases,
      ...entry.common_names.en,
      ...entry.common_names.nl,
    ].map(s => s.toLowerCase());

    const tokens: string[] = [];
    for (const h of haystacks) {
      for (const tok of h.split(/[\s\-_]+/).filter(Boolean)) {
        tokens.push(tok);
      }
    }

    indexed.push({ entry, haystacks, tokens });
  }

  return {
    all() {
      return entries;
    },
    get(slug: string) {
      return bySlug.get(slug);
    },
    search(query: string, limit = 20) {
      const q = query.trim().toLowerCase();
      if (q.length === 0) return [];

      const scored: Array<{ score: number; entry: CatalogEntry }> = [];
      for (const { entry, haystacks, tokens } of indexed) {
        const score = scoreMatch(q, entry, haystacks, tokens);
        if (score > 0) scored.push({ score, entry });
      }

      scored.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.entry.latin_name.localeCompare(b.entry.latin_name);
      });

      return scored.slice(0, limit).map(({ entry }) => toResult(entry));
    },
  };
}

function scoreMatch(
  q: string,
  entry: CatalogEntry,
  haystacks: string[],
  tokens: string[]
): number {
  const latin = entry.latin_name.toLowerCase();
  if (latin === q) return 100;
  if (latin.startsWith(q)) return 80;

  // Substring match in any haystack
  let best = 0;
  for (const h of haystacks) {
    if (h === q) best = Math.max(best, 70);
    else if (h.startsWith(q)) best = Math.max(best, 50);
    else if (h.includes(q)) best = Math.max(best, 30);
  }

  // Token-prefix match (e.g., query "mon" matches token "monstera")
  for (const tok of tokens) {
    if (tok === q) best = Math.max(best, 40);
    else if (tok.startsWith(q)) best = Math.max(best, 20);
  }

  return best;
}

function toResult(entry: CatalogEntry): CatalogSearchResult {
  return {
    slug: entry.slug,
    latin_name: entry.latin_name,
    category: entry.category,
    primary_common_name: entry.common_names.en[0],
  };
}
