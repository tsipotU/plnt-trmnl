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
  ConditionSeverity,
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
const VALID_SEVERITY: readonly ConditionSeverity[] = ['info', 'warning', 'critical'];
const REQUIRED_CONDITIONS_COUNT = 15;
const REQUIRED_FACTS_COUNT = 15;

export interface Catalog {
  all(): readonly CatalogEntry[];
  get(slug: string): CatalogEntry | undefined;
  search(query: string, limit?: number): CatalogSearchResult[];
  /**
   * Fuzzy "did you mean" lookup. Returns up to `limit` catalog matches that are
   * similar-but-not-identical to `query` (normalised Levenshtein >= threshold).
   * Used by the enrichment fallback flow when Claude can't recognise a typo.
   */
  suggest(query: string, limit?: number): CatalogSearchResult[];
  /**
   * Lookup a catalog entry by the user's stored species / common name string.
   * Case-insensitive exact match against latin_name, aliases, and
   * common_names.en / .nl. Returns undefined if no match or name is null/empty.
   */
  findBySpecies(name: string | null | undefined): CatalogEntry | undefined;
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

  // Optional fields (#37): lore + etymology. If present, must be non-empty strings.
  if (e.lore !== undefined && (typeof e.lore !== 'string' || e.lore.length === 0)) {
    throw new Error(`${loc}.lore must be a non-empty string when provided`);
  }
  if (e.etymology !== undefined && (typeof e.etymology !== 'string' || e.etymology.length === 0)) {
    throw new Error(`${loc}.etymology must be a non-empty string when provided`);
  }

  // #3: light_profile
  if (!e.light_profile || typeof e.light_profile !== 'object') {
    throw new Error(`${loc}.light_profile must be an object`);
  }
  const lp = e.light_profile as Record<string, unknown>;
  if (typeof lp.ideal !== 'string' || !VALID_LIGHT.includes(lp.ideal as LightPreference)) {
    throw new Error(`${loc}.light_profile.ideal invalid: ${String(lp.ideal)}`);
  }
  if (typeof lp.tolerance_min !== 'string' ||
      !VALID_LIGHT.includes(lp.tolerance_min as LightPreference)) {
    throw new Error(`${loc}.light_profile.tolerance_min invalid: ${String(lp.tolerance_min)}`);
  }
  if (typeof lp.tolerance_max !== 'string' ||
      !VALID_LIGHT.includes(lp.tolerance_max as LightPreference)) {
    throw new Error(`${loc}.light_profile.tolerance_max invalid: ${String(lp.tolerance_max)}`);
  }
  requireString(lp.direct_sun_hours, `${loc}.light_profile.direct_sun_hours`);
  requireString(lp.too_little_symptoms, `${loc}.light_profile.too_little_symptoms`);
  requireString(lp.too_much_symptoms, `${loc}.light_profile.too_much_symptoms`);

  // #3: placement_tips
  requireStringArray(e.placement_tips, `${loc}.placement_tips`);
  if ((e.placement_tips as string[]).length === 0) {
    throw new Error(`${loc}.placement_tips must have at least one entry`);
  }

  // #3: conditions — exactly 15 structured entries, with ≥1 is_common flagged
  if (!Array.isArray(e.conditions)) {
    throw new Error(`${loc}.conditions must be an array`);
  }
  if (e.conditions.length !== REQUIRED_CONDITIONS_COUNT) {
    throw new Error(
      `${loc}.conditions must have exactly ${REQUIRED_CONDITIONS_COUNT} entries (got ${e.conditions.length})`
    );
  }
  e.conditions.forEach((c, j) => {
    const cloc = `${loc}.conditions[${j}]`;
    if (!c || typeof c !== 'object') throw new Error(`${cloc} is not an object`);
    const cond = c as Record<string, unknown>;
    requireString(cond.name, `${cloc}.name`);
    requireString(cond.symptoms, `${cloc}.symptoms`);
    requireString(cond.remedy, `${cloc}.remedy`);
    requireString(cond.prevention, `${cloc}.prevention`);
    if (typeof cond.severity !== 'string' ||
        !VALID_SEVERITY.includes(cond.severity as ConditionSeverity)) {
      throw new Error(`${cloc}.severity invalid: ${String(cond.severity)}`);
    }
    if (typeof cond.is_common !== 'boolean') {
      throw new Error(`${cloc}.is_common must be a boolean`);
    }
  });

  // #4: facts — exactly 15 non-empty strings.
  if (!Array.isArray(e.facts)) {
    throw new Error(`${loc}.facts must be an array`);
  }
  if (e.facts.length !== REQUIRED_FACTS_COUNT) {
    throw new Error(
      `${loc}.facts must have exactly ${REQUIRED_FACTS_COUNT} entries (got ${e.facts.length})`
    );
  }
  e.facts.forEach((f, j) => {
    if (typeof f !== 'string' || f.trim().length === 0) {
      throw new Error(`${loc}.facts[${j}] must be a non-empty string`);
    }
  });

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
  const byName = new Map<string, CatalogEntry>();
  const indexed: IndexedEntry[] = [];

  for (const entry of entries) {
    bySlug.set(entry.slug, entry);
    const haystacks = [
      entry.latin_name,
      ...entry.aliases,
      ...entry.common_names.en,
      ...entry.common_names.nl,
    ].map(s => s.toLowerCase());

    // Exact-name index for findBySpecies — first write wins so the preferred
    // canonical slug is returned for shared common names.
    for (const h of haystacks) {
      if (!byName.has(h)) byName.set(h, entry);
    }

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
    findBySpecies(name: string | null | undefined) {
      if (!name) return undefined;
      const key = name.trim().toLowerCase();
      if (!key) return undefined;
      return byName.get(key);
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
    suggest(query: string, limit = 3) {
      const q = query.trim().toLowerCase();
      if (q.length === 0) return [];

      // Strategy:
      //   - For SINGLE-token queries (e.g. "snake", "monstra"), score against
      //     each indexed token — catches short common-name hits like
      //     "snake" → "Snake plant".
      //   - For MULTI-token queries (e.g. "monstera diliciosa"), score
      //     against whole haystacks only. This prevents false positives like
      //     "xyzzy plant" matching every entry that contains the word
      //     "plant".
      const queryTokens = q.split(/[\s\-_]+/).filter(Boolean);
      const isSingleToken = queryTokens.length <= 1;
      const scored: Array<{ sim: number; entry: CatalogEntry }> = [];

      for (const { entry, haystacks, tokens } of indexed) {
        let best = 0;

        if (isSingleToken) {
          for (const tok of tokens) {
            const sim = similarity(q, tok);
            if (sim > best) best = sim;
          }
        } else {
          for (const h of haystacks) {
            const sim = similarity(q, h);
            if (sim > best) best = sim;
          }
          // Guard against matches that only win on a shared trailing word
          // (e.g. "xyzzy plant" vs "ZZ plant"). Require every meaningful
          // (length >= 4) query token to have a reasonably close neighbour
          // in the entry's tokens. If any significant token has no such
          // neighbour, we treat this as an unknown name, not a typo.
          if (best >= SUGGEST_THRESHOLD) {
            const allMeaningfulTokensSupported = queryTokens.every((qt) => {
              if (qt.length < 4) return true;
              for (const tok of tokens) {
                if (similarity(qt, tok) >= SUGGEST_TOKEN_SUPPORT) return true;
              }
              return false;
            });
            if (!allMeaningfulTokensSupported) best = 0;
          }
        }

        if (best >= SUGGEST_THRESHOLD) {
          scored.push({ sim: best, entry });
        }
      }

      scored.sort((a, b) => {
        if (b.sim !== a.sim) return b.sim - a.sim;
        return a.entry.latin_name.localeCompare(b.entry.latin_name);
      });

      return scored.slice(0, limit).map(({ entry }) => toResult(entry));
    },
  };
}

// Minimum normalised similarity (0..1) for a catalog entry to count as a
// "did you mean" suggestion. Tuned so "monstera diliciosa" → "Monstera
// deliciosa" lands comfortably above the bar while "xyzzy plant" stays out.
const SUGGEST_THRESHOLD = 0.7;
// For multi-token queries, each meaningful (length >= 4) query token must
// find at least one entry token with this much similarity. Prevents a single
// shared trailing word (e.g. "plant") from dragging a totally unrelated
// query over the line.
const SUGGEST_TOKEN_SUPPORT = 0.6;

/**
 * Normalised similarity in [0, 1], where 1 == identical and 0 == totally
 * different. Uses Levenshtein edit distance over the longer string length.
 * Exported for tests.
 */
export function similarity(a: string, b: string): number {
  const aa = a.toLowerCase();
  const bb = b.toLowerCase();
  if (aa.length === 0 && bb.length === 0) return 1;
  const maxLen = Math.max(aa.length, bb.length);
  if (maxLen === 0) return 1;
  const d = levenshtein(aa, bb);
  return 1 - d / maxLen;
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  // Two-row DP to keep memory small for short plant names.
  let prev = new Array<number>(b.length + 1);
  let curr = new Array<number>(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;

  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
      curr[j] = Math.min(
        curr[j - 1] + 1,       // insertion
        prev[j] + 1,           // deletion
        prev[j - 1] + cost,    // substitution
      );
    }
    [prev, curr] = [curr, prev];
  }

  return prev[b.length];
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
